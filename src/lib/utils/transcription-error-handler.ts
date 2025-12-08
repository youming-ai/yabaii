/** * 统一TranscriptionErrorProcess工具 * 替代项目in分散TranscriptionErrorProcess代码*/

import { toast } from "sonner";
import { logError } from "./error-handler";

export interface TranscriptionErrorContext {
  fileId?: number;
  fileName?: string;
  language?: string;
  operation: "transcribe" | "postprocess" | "fetch";
}

/** * 统一TranscriptionErrorProcess函数*/
export function handleTranscriptionError(error: unknown, context: TranscriptionErrorContext): void {
  // 改进Error消息提取 - Process各种Errorclass型
  let errorMessage = "未知错误";

  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === "string") {
    errorMessage = error;
  } else if (error && typeof error === "object") {
    // ProcessFrom API Errorobject
    const errObj = error as Record<string, unknown>;
    if ("message" in errObj && typeof errObj.message === "string") {
      errorMessage = errObj.message;
    } else if ("error" in errObj) {
      if (typeof errObj.error === "string") {
        errorMessage = errObj.error;
      } else if (errObj.error && typeof errObj.error === "object" && "message" in errObj.error) {
        errorMessage = String((errObj.error as Record<string, unknown>).message);
      }
    } else if (Object.keys(errObj).length === 0) {
      // 空object - 可能i网络Error或被取消request
      errorMessage = "请求失败（无详细信息）";
    } else {
      // 将整个object序列化a字符串以便调试
      try {
        errorMessage = `API 错误: ${JSON.stringify(error)}`;
      } catch {
        errorMessage = "无法序列化的错误对象";
      }
    }
  }

  // IfError消息仍然a空或未知，提供更多上下文
  if (!errorMessage || errorMessage === "未知错误") {
    errorMessage = `转录失败 - 错误类型: ${typeof error}, 内容: ${JSON.stringify(error)}`;
  }

  const { fileId, operation } = context;

  // 构建详细Error消息
  const detailedMessage = buildDetailedErrorMessage(errorMessage, context);

  // recordToError监控系统
  const appError =
    error instanceof Error
      ? {
          code: "TRANSCRIPTION_ERROR",
          message: error.message,
          statusCode: 500,
          stack: error.stack,
        }
      : {
          code: "TRANSCRIPTION_ERROR",
          message: "未知错误",
          statusCode: 500,
          stack: undefined,
        };

  // 构建Error上下文字符串
  const contextString = `转录操作失败 - 文件ID: ${fileId || "未知"}, 操作: ${operation}, 错误: ${detailedMessage}`;

  logError(appError, contextString);

  // 显示用户友好Error消息
  const userMessage = getUserFriendlyErrorMessage(errorMessage, operation);
  toast.error(userMessage);

  // 控制台输出（开发环境）
  if (process.env.NODE_ENV === "development") {
    console.error(
      `❌ ${operation === "transcribe" ? "转录" : operation === "postprocess" ? "后处理" : "获取"}失败:`,
      {
        error,
        context,
        detailedMessage,
      },
    );
  }
}

/** * 构建详细Error消息*/
function buildDetailedErrorMessage(
  baseMessage: string,
  context: TranscriptionErrorContext,
): string {
  const { fileId, fileName, operation } = context;
  const operationText =
    operation === "transcribe" ? "转录" : operation === "postprocess" ? "后处理" : "数据获取";

  let message = `${operationText}失败: ${baseMessage}`;

  if (fileId) {
    message += ` (文件ID: ${fileId})`;
  }

  if (fileName) {
    message += ` (文件名: ${fileName})`;
  }

  return message;
}

/** * Get用户友好Error消息*/
function getUserFriendlyErrorMessage(baseMessage: string, operation: string): string {
  // 常见Error映射
  const commonErrors: Record<string, string> = {
    network: "网络连接失败，请检查网络连接后重试",
    timeout: "处理超时，请稍后重试",
    "file too large": "文件过大，请选择较小的音频文件",
    "invalid format": "音频格式不支持，请使用 MP3、WAV 或 M4A 格式",
    "quota exceeded": "API 配额已用完，请稍后重试",
    "rate limit": "请求过于频繁，请稍后重试",
    authentication: "认证失败，请检查配置",
    permission: "权限不足，请检查 API 密钥配置",
    fetch: "数据获取失败，请检查网络连接",
  };

  // Checkis否包含常见Error
  const lowerMessage = baseMessage.toLowerCase();
  for (const [key, friendlyMessage] of Object.entries(commonErrors)) {
    if (lowerMessage.includes(key)) {
      return friendlyMessage;
    }
  }

  // 根据operationsclass型返回默认消息
  const operationText =
    operation === "transcribe" ? "转录" : operation === "postprocess" ? "文本处理" : "数据处理";

  return `${operationText}失败: ${baseMessage}`;
}

/** * TranscriptionSuccessProcess*/
export function handleTranscriptionSuccess(
  context: TranscriptionErrorContext & {
    duration?: number;
    textLength?: number;
  },
): void {
  const { fileId, fileName, operation, duration, textLength } = context;

  const operationText =
    operation === "transcribe" ? "转录" : operation === "postprocess" ? "后处理" : "处理";

  let successMessage = `${operationText}完成`;

  if (fileName) {
    successMessage += ` - ${fileName}`;
  }

  if (duration && textLength) {
    const wordsPerMinute = Math.round((textLength / duration) * 60);
    successMessage += ` (${wordsPerMinute} 字/分钟)`;
  }

  toast.success(successMessage);

  // 开发环境输出详细信息
  if (process.env.NODE_ENV === "development") {
    console.log(`✅ ${operationText}完成:`, {
      fileId,
      fileName,
      duration,
      textLength,
    });
  }
}

/** * Transcription进度UpdateProcess*/
export function handleTranscriptionProgress(
  progress: number,
  context: TranscriptionErrorContext,
): void {
  // 开发环境输出进度信息
  if (process.env.NODE_ENV === "development") {
    const { fileId, fileName, operation } = context;
    const operationText =
      operation === "transcribe" ? "转录" : operation === "postprocess" ? "后处理" : "处理";

    console.log(`📊 ${operationText}进度: ${progress}%`, { fileId, fileName });
  }

  // 可以在这里Add其他进度Process逻辑，如Update进度条等
}
