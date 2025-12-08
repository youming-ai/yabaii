import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DBUtils, db } from "@/lib/db/db";
import {
  handleTranscriptionError,
  handleTranscriptionSuccess,
} from "@/lib/utils/transcription-error-handler";

// Transcription response type
interface TranscriptionResponse {
  success: boolean;
  data: {
    status: string;
    text: string;
    language: string;
    duration?: number;
    segments: Array<{
      start: number;
      end: number;
      text: string;
      wordTimestamps?: Array<{
        word: string;
        start: number;
        end: number;
      }>;
    }>;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Query keys for transcription status
export const transcriptionKeys = {
  all: ["transcription"] as const,
  forFile: (fileId: number) => [...transcriptionKeys.all, "file", fileId] as const,
  progress: (fileId: number) => [...transcriptionKeys.forFile(fileId), "progress"] as const,
};

// Query to get file transcription status - using unified DBUtils
export function useTranscriptionStatus(fileId: number) {
  return useQuery({
    queryKey: transcriptionKeys.forFile(fileId),
    queryFn: async () => {
      // Get transcript record using DBUtils
      const transcript = await DBUtils.findTranscriptByFileId(fileId);

      if (transcript && typeof transcript.id === "number") {
        // Get segments using DBUtils, sorted by time
        const segments = await DBUtils.getSegmentsByTranscriptIdOrdered(transcript.id);
        return {
          transcript,
          segments,
        };
      }

      return {
        transcript: null,
        segments: [],
      };
    },
    staleTime: 1000 * 60 * 15, // 15 minutes - increased cache time to reduce network requests
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/** * Save transcription results to database - uses transactions for atomicity * Improved transaction handling with error recovery and partial retry mechanism*/
async function saveTranscriptionResults(
  fileId: number,
  data: TranscriptionResponse["data"],
): Promise<number> {
  const startTime = Date.now();

  try {
    return await db.transaction("rw", db.transcripts, db.segments, async (tx) => {
      // 1. 首先查找现有Transcriptionrecord
      const existingTranscripts = await tx
        .table("transcripts")
        .where("fileId")
        .equals(fileId)
        .toArray();

      let transcriptId: number;

      if (existingTranscripts.length > 0 && existingTranscripts[0].id) {
        // Update现有Transcriptionrecord
        transcriptId = existingTranscripts[0].id;
        await tx.table("transcripts").update(transcriptId, {
          status: "completed" as const,
          rawText: data.text,
          language: data.language,
          duration: data.duration,
          error: undefined, // 清除之前Error
          updatedAt: new Date(),
        });

        // Delete旧 segments（If有话）
        await tx.table("segments").where("transcriptId").equals(transcriptId).delete();
      } else {
        // 创建新Transcriptionrecord
        transcriptId = await tx.table("transcripts").add({
          fileId,
          status: "completed" as const,
          rawText: data.text,
          language: data.language,
          duration: data.duration,
          processingTime: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // 2. batchAdd新 segments
      if (data.segments && data.segments.length > 0) {
        // a防止大数据集transactiontimeout，分批Process segments
        const BATCH_SIZE = 100;
        const segments = data.segments.map((segment, index) => ({
          transcriptId,
          start: segment.start,
          end: segment.end,
          text: segment.text,
          wordTimestamps: segment.wordTimestamps || [],
          // Add序号以保持顺序
          segmentIndex: index,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        // 分批插入以避免Memory问题
        for (let i = 0; i < segments.length; i += BATCH_SIZE) {
          const batch = segments.slice(i, i + BATCH_SIZE);
          await tx.table("segments").bulkAdd(batch);

          // If数据量大，Add小delay以避免阻塞UI
          if (i > 0 && i % (BATCH_SIZE * 5) === 0) {
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
        }
      }

      const processingTime = Date.now() - startTime;
      console.log(
        `✅ 转录结果保存完成 (文件ID: ${fileId}) - 耗时: ${processingTime}ms, segments: ${data.segments?.length || 0}`,
      );

      return transcriptId;
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ 转录结果保存失败 (文件ID: ${fileId}) - 耗时: ${processingTime}ms`, error);

    // 尝试清理可能部分数据
    try {
      await db.transaction("rw", db.transcripts, db.segments, async (tx) => {
        const transcripts = await tx.table("transcripts").where("fileId").equals(fileId).toArray();

        for (const transcript of transcripts) {
          if (transcript.id) {
            await tx.table("segments").where("transcriptId").equals(transcript.id).delete();
            await tx.table("transcripts").delete(transcript.id);
          }
        }
      });
    } catch (cleanupError) {
      console.error("清理失败转录数据时出错:", cleanupError);
    }

    throw error;
  }
}

/** * 后ProcessTranscription结果 - TranslationTo用户母语*/
async function postProcessTranscription(
  transcriptId: number,
  _fileId: number,
  segments: Array<{ start: number; end: number; text: string }>,
  sourceLanguage: string,
  targetLanguage: string,
  onComplete?: () => void,
): Promise<void> {
  if (!segments || segments.length === 0) {
    console.log("⚠️ 后处理跳过：没有 segments");
    return;
  }

  console.log(`🔄 开始后处理 ${segments.length} 个 segments`);
  console.log(`   源语言(音频): ${sourceLanguage} → 目标语言(翻译): ${targetLanguage}`);

  try {
    const response = await fetch("/api/postprocess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        segments: segments.map((s) => ({
          text: s.text,
          start: s.start,
          end: s.end,
        })),
        language: sourceLanguage,
        targetLanguage: targetLanguage,
        enableAnnotations: true,
        enableFurigana: sourceLanguage === "ja",
      }),
    });

    if (!response.ok) {
      console.error(`❌ 后处理 API 失败: ${response.status} ${response.statusText}`);
      return;
    }

    const result = await response.json();
    console.log("📦 后处理 API 响应:", {
      success: result.success,
      segmentCount: result.data?.segments?.length,
    });

    if (!result.success || !result.data?.segments) {
      console.error("❌ 后处理响应无效:", result);
      return;
    }

    // Updatedatabasein segments
    let updatedCount = 0;
    for (const processedSegment of result.data.segments) {
      const count = await db.segments
        .where("transcriptId")
        .equals(transcriptId)
        .and(
          (segment) =>
            segment.start === processedSegment.start && segment.end === processedSegment.end,
        )
        .modify({
          normalizedText: processedSegment.normalizedText,
          translation: processedSegment.translation,
          annotations: processedSegment.annotations,
          furigana: processedSegment.furigana,
        });
      updatedCount += count;
    }

    console.log(`✅ 后处理完成，更新了 ${updatedCount} 个 segments`);

    // 通知完成，触发 UI 刷新
    onComplete?.();
  } catch (error) {
    // 后ProcessFailed不影响主流程，但recordError
    console.error("❌ 后处理异常:", error);
  }
}

/** * delay函数*/
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** * 判断Erroris否可重试*/
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  // 网络Error、timeout、server临时Error可重试
  return (
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("503") ||
    message.includes("502") ||
    message.includes("500") ||
    message.includes("failed to fetch")
  );
}

// Transcriptionoperations mutation - 支持自动重试和取消
export function useTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileId,
      language = "ja",
      nativeLanguage = "zh-CN",
      maxRetries = 3,
      signal,
    }: {
      fileId: number;
      language?: string;
      nativeLanguage?: string;
      maxRetries?: number;
      signal?: AbortSignal;
    }) => {
      // Through DBUtils GetFile数据
      const file = await DBUtils.getFile(fileId);
      if (!file || !file.blob) {
        throw new Error("File not found or file data is corrupted");
      }

      // 准备table单数据
      const formData = new FormData();
      formData.append("audio", file.blob, file.name);
      formData.append("meta", JSON.stringify({ fileId: file.id?.toString() || "" }));

      let lastError: Error | null = null;

      // 重试循环
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        // Checkis否已取消
        if (signal?.aborted) {
          throw new DOMException("转录已取消", "AbortError");
        }

        try {
          // 调用server端 API 路由，传入 signal 支持取消
          const response = await fetch(`/api/transcribe?fileId=${fileId}&language=${language}`, {
            method: "POST",
            body: formData,
            signal,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const errorMessage =
              errorData?.message ||
              errorData?.error?.message ||
              `转录失败: ${response.statusText} (${response.status})`;
            throw new Error(errorMessage);
          }

          const result: TranscriptionResponse = await response.json();

          if (!result.success) {
            throw new Error(result.error?.message || "转录请求失败");
          }

          // SaveTranscription结果Todatabase（使用transaction）
          const transcriptId = await saveTranscriptionResults(fileId, result.data);

          // 后Process：TranslationTo用户母语（异步执行，不阻塞主流程）
          // 使用 Whisper 检测ToLanguage作a源Language，更准确
          const detectedLanguage = result.data.language || language;

          postProcessTranscription(
            transcriptId,
            fileId,
            result.data.segments,
            detectedLanguage, // 源Language：Whisper 检测ToLanguage
            nativeLanguage, // 目标Language：用户母语（Translation目标）
            // onComplete 回调不再尝试刷新Cache，因a可能导致Error
            // Translation数据已SaveTodatabase，用户刷新页面即可看To
            undefined,
          ).catch((err) => {
            console.error("后处理失败:", err);
          });

          return result.data;
        } catch (error) {
          // Ifis取消operations，直接抛出不重试
          if (error instanceof DOMException && error.name === "AbortError") {
            throw error;
          }

          lastError = error instanceof Error ? error : new Error(String(error));

          // 最后一次尝试或不可重试Error，直接抛出
          if (attempt === maxRetries - 1 || !isRetryableError(error)) {
            handleTranscriptionError(error, {
              fileId,
              operation: "transcribe",
              language,
            });
            throw error;
          }

          // 指数退避等待
          const waitTime = 1000 * 2 ** attempt; // 1, 2, 4
          await delay(waitTime);
        }
      }

      // 不应该To达这里，但a了class型安全
      throw lastError || new Error("转录失败");
    },
    onSuccess: (_result, variables) => {
      // Transcription完成并Save
      handleTranscriptionSuccess({
        fileId: variables.fileId,
        operation: "transcribe",
        language: variables.language,
      });

      // 使QueryCache失效，触发重新Query - 优化Cache策略
      queryClient.invalidateQueries({
        queryKey: transcriptionKeys.forFile(variables.fileId),
      });
    },
    onError: (error, variables) => {
      handleTranscriptionError(error, {
        fileId: variables.fileId,
        operation: "transcribe",
        language: variables.language,
      });

      // 刷新Querystate - 合并Cache失效调用，减少网络request
      queryClient.invalidateQueries({
        queryKey: transcriptionKeys.forFile(variables.fileId),
      });
    },
  });
}
