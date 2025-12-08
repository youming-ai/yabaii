/** * 统一Transcription服务 - 基于 Groq SDK Simplified版本 * 合并了 transcription-service.t 和 transcription-service-ai-sdk.t functionality * Removed了complexAudio分块Process，使用统一 Groq SDK API*/

import Groq from "groq-sdk";
import {
  buildSegmentsFromPlainText,
  buildSegmentsFromWords,
  mapGroqSegmentToTranscriptionSegment,
} from "@/lib/ai/groq-transcription-utils";
import type { GroqTranscriptionResponse } from "@/types/transcription";

export interface TranscriptionOptions {
  language?: string;
  prompt?: string;
  onProgress?: (progress: {
    chunkIndex: number;
    totalChunks: number;
    status: "pending" | "processing" | "completed" | "failed";
    progress: number;
    message?: string;
    error?: string;
  }) => void;
}

export type TranscriptionResult = import("@/types/transcription").TranscriptionResult;

export interface TranscriptionProgress {
  fileId: number;
  status: "idle" | "processing" | "completed" | "error" | "failed" | "pending";
  progress: number;
  message: string;
}

interface PostProcessedSegment {
  start: number;
  end: number;
  normalizedText?: string;
  translation?: string;
  annotations?: string[];
  furigana?: string;
}

/** * 使用 AI SDK 进行Transcription - Simplified主函数*/
export async function transcribeAudio(
  fileId: number,
  options: TranscriptionOptions = {},
): Promise<TranscriptionResult> {
  const { db } = await import("../db/db");
  const startTime = Date.now();

  try {
    // Update进度
    await updateTranscriptionProgress(fileId, 10, "准备转录...", "processing", options);

    // GetFile数据
    const fileRecord = await db.files.get(fileId);
    if (!fileRecord) {
      throw new Error("文件不存在");
    }

    await updateTranscriptionProgress(fileId, 30, "开始转录处理...", "processing", options);

    // 使用 AI SDK 进行Transcription
    const result = await transcribeWithGroqSDK(fileRecord, options);

    // Save结果
    await updateTranscriptionProgress(fileId, 90, "保存转录结果...", "processing", options);
    const transcriptId = await saveTranscriptionResult(fileId, result, options, startTime);

    // 后Process（可选，不影响主要流程）
    try {
      await updateTranscriptionProgress(fileId, 95, "后处理...", "processing", options);
      await processPostTranscription(transcriptId, result);
    } catch {
      // 后ProcessFailed不影响主流程
      await updateTranscriptionProgress(fileId, 95, "转录完成，后处理失败", "processing", options);
    }

    await updateTranscriptionProgress(fileId, 100, "转录完成", "completed", options);

    return result;
  } catch (error) {
    await updateTranscriptionProgress(fileId, 0, "转录失败", "failed", options);

    // 改进ErrorProcess - 确保Errorobject有意义
    if (!error) {
      throw new Error("转录过程中发生未知错误");
    } else if (
      typeof error === "object" &&
      error !== null &&
      !("message" in error) &&
      !("error" in error)
    ) {
      // ProcessFrom Groq SDK Errorobject
      const errorStr = JSON.stringify(error);
      throw new Error(`转录 API 错误: ${errorStr}`);
    } else {
      throw error;
    }
  }
}

/** * Groq SDK Transcription实现 - Simplified版本*/
async function transcribeWithGroqSDK(
  fileRecord: import("@/types/db/database").FileRow,
  options: TranscriptionOptions,
): Promise<TranscriptionResult> {
  if (!fileRecord.id) {
    throw new Error("文件ID不存在");
  }

  await updateTranscriptionProgress(
    fileRecord.id,
    50,
    "正在进行语音转录...",
    "processing",
    options,
  );

  // Check API 密钥
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Groq API 密钥未配置");
  }

  // 初始化 Groq client
  const groq = new Groq({ apiKey });

  // CheckFile数据
  if (!fileRecord.blob) {
    throw new Error("文件数据不存在");
  }

  // 将 Blob 转换a File object
  const file = new File([fileRecord.blob], fileRecord.name, {
    type: fileRecord.type,
    lastModified: fileRecord.uploadedAt.getTime(),
  });

  const transcription = await groq.audio.transcriptions.create({
    file: file, // 使用转换后 File object
    model: "whisper-large-v3-turbo",
    temperature: 0,
    response_format: "verbose_json",
    language: options.language === "auto" ? undefined : options.language,
    timestamp_granularities: ["word", "segment"],
  });

  // ProcessTranscription结果 - Simplified逻辑
  const transcriptionData = transcription as GroqTranscriptionResponse;
  let processedSegments: TranscriptionResult["segments"] = [];

  if (Array.isArray(transcriptionData.segments) && transcriptionData.segments.length > 0) {
    processedSegments = transcriptionData.segments.map((segment, index) =>
      mapGroqSegmentToTranscriptionSegment(segment, index + 1),
    );
  } else if (Array.isArray(transcriptionData.words) && transcriptionData.words.length > 0) {
    processedSegments = buildSegmentsFromWords(transcriptionData.words);
  } else if (typeof transcriptionData.text === "string" && transcriptionData.text.length > 0) {
    processedSegments = buildSegmentsFromPlainText(
      transcriptionData.text,
      transcriptionData.duration,
    );
  }

  return {
    text: transcriptionData.text ?? "",
    language: transcriptionData.language || options.language || "auto",
    duration: transcriptionData.duration,
    segments: processedSegments,
  };
}

/** * SaveTranscription结果 - Simplified版本*/
async function saveTranscriptionResult(
  fileId: number,
  result: TranscriptionResult,
  _options: TranscriptionOptions,
  startTime: number,
): Promise<number> {
  const { db } = await import("../db/db");

  const transcriptId = await db.transcripts.add({
    fileId,
    status: "completed",
    rawText: result.text,
    language: result.language || "ja",
    processingTime: Date.now() - startTime,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  if (result.segments && result.segments.length > 0) {
    const now = new Date();
    const segmentsToSave = result.segments.map((segment) => ({
      transcriptId,
      start: segment.start,
      end: segment.end,
      text: segment.text,
      createdAt: now,
      updatedAt: now,
    }));

    await db.segments.bulkAdd(segmentsToSave);
  }

  return transcriptId;
}

/** * 后Process - Simplified版本，Error不影响主要流程*/
async function processPostTranscription(
  transcriptId: number,
  result: TranscriptionResult,
): Promise<void> {
  if (!result.segments || result.segments.length === 0) return;

  try {
    const response = await fetch("/api/postprocess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        segments: result.segments,
        language: result.language || "ja",
        targetLanguage: "zh",
        enableAnnotations: true,
        enableFurigana: true,
        enableTerminology: true,
      }),
    });

    if (!response.ok) return;

    const postProcessResult = (await response.json()) as {
      success: boolean;
      data?: { segments?: PostProcessedSegment[] };
    };
    if (!postProcessResult.success || !postProcessResult.data?.segments) return;

    const { db } = await import("../db/db");
    for (const processedSegment of postProcessResult.data.segments) {
      await db.segments
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
    }
  } catch {
    // 后ProcessFailed不影响主流程
  }
}

/** * UpdateTranscription进度 - Simplified版本*/
async function updateTranscriptionProgress(
  fileId: number,
  progress: number,
  message: string,
  status: "processing" | "completed" | "failed",
  options?: TranscriptionOptions,
): Promise<void> {
  try {
    const { setServerProgress } = await import("./server-progress");
    setServerProgress(fileId, { status, progress, message });
  } catch {
    // Update进度Failed不影响主流程
  }

  if (options?.onProgress) {
    options.onProgress({
      chunkIndex: 0,
      totalChunks: 1,
      status,
      progress,
      message,
    });
  }
}

/** * GetTranscription进度 - Simplified版本*/
export async function getTranscriptionProgress(fileId: number): Promise<TranscriptionProgress> {
  try {
    const { db } = await import("../db/db");
    const transcripts = await db.transcripts.where("fileId").equals(fileId).toArray();

    const processingTranscript = transcripts.find((t) => t.status === "processing");

    if (processingTranscript) {
      const processingTime = Date.now() - processingTranscript.createdAt.getTime();
      const estimatedProgress = Math.min(95, Math.floor(processingTime / 1000));

      return {
        fileId,
        status: "processing",
        progress: estimatedProgress,
        message: "正在转录中...",
      };
    }

    const completedTranscript = transcripts.find((t) => t.status === "completed");
    if (completedTranscript) {
      return {
        fileId,
        status: "completed",
        progress: 100,
        message: "转录完成",
      };
    }

    return {
      fileId,
      status: "idle",
      progress: 0,
      message: "未开始转录",
    };
  } catch (_error) {
    return {
      fileId,
      status: "error",
      progress: 0,
      message: "获取进度失败",
    };
  }
}

/** * GetFileTranscriptionrecord - Simplified版本*/
export async function getFileTranscripts(fileId: number) {
  const { db } = await import("../db/db");
  return await db.transcripts.where("fileId").equals(fileId).toArray();
}

/** * 后Processsegments - Simplified版本*/
export async function postProcessSegmentsByTranscriptId(
  transcriptId: number,
  _options: {
    targetLanguage?: string;
    enableAnnotations?: boolean;
    enableFurigana?: boolean;
    enableTerminology?: boolean;
  } = {},
) {
  try {
    const { db } = await import("../db/db");
    const segments = await db.segments.where("transcriptId").equals(transcriptId).toArray();
    return segments;
  } catch {
    return [];
  }
}

export const TranscriptionService = {
  transcribeAudio,
  getTranscriptionProgress,
  getFileTranscripts,
  postProcessSegmentsByTranscriptId,
};
