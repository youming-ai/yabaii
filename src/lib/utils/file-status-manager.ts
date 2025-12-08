/** * 统一Filestate管理器 * 消除 FileRow.status 和 TranscriptRow.status 不一致问题 * 以 TranscriptRow.status a唯一真实数据源 (Single Source of Truth)*/

import { db } from "@/lib/db/db";
import { FileStatus } from "@/types/db/database";

export type TranscriptStatus = "pending" | "processing" | "completed" | "failed";

/** * Filestate映射器 * 将 TranscriptRow.status 映射To FileStatus*/
export function mapTranscriptStatusToFileStatus(status: TranscriptStatus | undefined): FileStatus {
  switch (status) {
    case "processing":
      return FileStatus.TRANSCRIBING;
    case "completed":
      return FileStatus.COMPLETED;
    case "failed":
      return FileStatus.ERROR;
    default:
      return FileStatus.UPLOADED;
  }
}

/** * GetFile真实state * 始终基于 TranscriptRow.status，不依赖 FileRow.status*/
export async function getFileRealStatus(fileId: number): Promise<{
  status: FileStatus;
  transcriptId?: number;
  transcript?: any;
}> {
  try {
    // GetTranscriptionrecord
    const transcripts = await db.transcripts.where("fileId").equals(fileId).toArray();
    const transcript = transcripts.length > 0 ? transcripts[0] : null;

    // If没有Transcriptionrecord，stateas UPLOADED
    if (!transcript) {
      return { status: FileStatus.UPLOADED };
    }

    // 返回基于Transcriptionrecordstate
    return {
      status: mapTranscriptStatusToFileStatus(transcript.status),
      transcriptId: transcript.id,
      transcript,
    };
  } catch (error) {
    console.error("获取文件真实状态失败:", error);
    // 出错时返回Errorstate
    return { status: FileStatus.ERROR };
  }
}

/** * UpdateTranscriptionstate（统一Update入口） * 只Update TranscriptRow，不Update FileRow.status*/
export async function updateTranscriptionStatus(
  fileId: number,
  status: TranscriptStatus,
  error?: string,
  additionalData?: Partial<any>,
): Promise<number | undefined> {
  try {
    return await db.transaction("rw", db.transcripts, async () => {
      // 查找现有Transcriptionrecord
      const transcripts = await db.transcripts.where("fileId").equals(fileId).toArray();

      let transcriptId: number;

      if (transcripts.length > 0 && transcripts[0].id) {
        // Update现有Transcriptionrecord
        transcriptId = transcripts[0].id;
        await db.transcripts.update(transcriptId, {
          status,
          error: error || undefined,
          updatedAt: new Date(),
          ...additionalData,
        });
      } else {
        // 创建新Transcriptionrecord（仅在开始Transcription时）
        transcriptId = await db.transcripts.add({
          fileId,
          status,
          error: error || undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...additionalData,
        });
      }

      return transcriptId;
    });
  } catch (error) {
    console.error("更新转录状态失败:", error);
    throw error;
  }
}

/** * batchGetFilestate * 优化性能，减少databaseQuery次数*/
export async function getFilesStatus(fileIds: number[]): Promise<Map<number, FileStatus>> {
  try {
    // batchQueryTranscriptionrecord
    const transcripts = await db.transcripts.where("fileId").anyOf(fileIds).toArray();

    const statusMap = new Map<number, FileStatus>();

    // 初始化所有Fileas UPLOADED state
    fileIds.forEach((fileId) => {
      statusMap.set(fileId, FileStatus.UPLOADED);
    });

    // Update有TranscriptionrecordFilestate
    transcripts.forEach((transcript) => {
      if (transcript.fileId) {
        statusMap.set(transcript.fileId, mapTranscriptStatusToFileStatus(transcript.status));
      }
    });

    return statusMap;
  } catch (error) {
    console.error("批量获取文件状态失败:", error);
    // 出错时返回Errorstate
    const errorMap = new Map<number, FileStatus>();
    fileIds.forEach((fileId) => {
      errorMap.set(fileId, FileStatus.ERROR);
    });
    return errorMap;
  }
}

/** * 清理过期Transcriptionrecord * Delete长时间处于 failed staterecord*/
export async function cleanupFailedTranscriptions(olderThanDays: number = 7): Promise<void> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const failedTranscripts = await db.transcripts
      .where("status")
      .equals("failed")
      .and((transcript) => transcript.updatedAt < cutoffDate)
      .toArray();

    for (const transcript of failedTranscripts) {
      if (transcript.id) {
        // Delete相关 segments
        await db.segments.where("transcriptId").equals(transcript.id).delete();
        // DeleteTranscriptionrecord
        await db.transcripts.delete(transcript.id);
      }
    }

    console.log(`清理了 ${failedTranscripts.length} 个过期的失败转录记录`);
  } catch (error) {
    console.error("清理过期转录记录失败:", error);
  }
}

/** * stateValidate器 * Validatestate转换i否合法*/
export function isValidStatusTransition(
  fromStatus: TranscriptStatus | undefined,
  toStatus: TranscriptStatus,
): boolean {
  // 允许state转换
  const validTransitions: Record<string, TranscriptStatus[]> = {
    undefined: ["pending", "processing"], // 初始state
    pending: ["processing", "failed"],
    processing: ["completed", "failed"],
    completed: ["processing"], // 允许重新Transcription
    failed: ["pending", "processing"], // 允许重试
  };

  const from = fromStatus || undefined;
  return validTransitions[String(from)]?.includes(toStatus) ?? false;
}

/** * 安全stateUpdate * 带stateValidateUpdate函数*/
export async function safeUpdateTranscriptionStatus(
  fileId: number,
  toStatus: TranscriptStatus,
  error?: string,
  additionalData?: Partial<any>,
): Promise<number | undefined> {
  try {
    // Get当前state
    const currentStatusInfo = await getFileRealStatus(fileId);
    const currentStatus = currentStatusInfo.transcript?.status;

    // Validatestate转换
    if (!isValidStatusTransition(currentStatus, toStatus)) {
      console.warn(`无效的状态转换: ${currentStatus} -> ${toStatus} (文件ID: ${fileId})`);
      // 可以选择抛出Error或继续执行
    }

    // 执行Update
    return await updateTranscriptionStatus(fileId, toStatus, error, additionalData);
  } catch (error) {
    console.error("安全更新转录状态失败:", error);
    throw error;
  }
}
