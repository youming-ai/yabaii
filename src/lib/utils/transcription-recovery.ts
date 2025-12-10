/** * TranscriptionError恢复和重试管理器 * 提供智能Error分class、恢复策略和重试机制*/

export interface TranscriptionErrorContext {
  fileId: number;
  fileName?: string;
  language?: string;
  operation: "transcribe" | "postprocess" | "fetch";
  attempt: number;
  maxAttempts: number;
}

export interface RecoveryStrategy {
  canRecover: boolean;
  retryDelay: number;
  maxRetries: number;
  action: "retry" | "fallback" | "abort";
  userMessage: string;
  technicalMessage?: string;
}

/** * Error分class器functions*/

/** * 分析Errorclass型并返回恢复策略*/
function classifyError(error: unknown, context: TranscriptionErrorContext): RecoveryStrategy {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // 网络相关Error - 可重试
  if (isNetworkError(lowerMessage)) {
    return {
      canRecover: true,
      retryDelay: calculateRetryDelay(context.attempt, 2000),
      maxRetries: 5,
      action: "retry",
      userMessage: "网络连接不稳定，正在重试...",
      technicalMessage: `Network error: ${errorMessage}`,
    };
  }

  // API 限流Error - 可重试，但需要更长delay
  if (isRateLimitError(lowerMessage)) {
    return {
      canRecover: true,
      retryDelay: calculateRetryDelay(context.attempt, 30000), // 30seconds基础delay
      maxRetries: 3,
      action: "retry",
      userMessage: "API请求频率过高，等待后重试...",
      technicalMessage: `Rate limit exceeded: ${errorMessage}`,
    };
  }

  // server临时Error - 可重试
  if (isTemporaryServerError(lowerMessage)) {
    return {
      canRecover: true,
      retryDelay: calculateRetryDelay(context.attempt, 5000),
      maxRetries: 3,
      action: "retry",
      userMessage: "服务器暂时繁忙，正在重试...",
      technicalMessage: `Temporary server error: ${errorMessage}`,
    };
  }

  // File相关Error - 不可重试，需要用户干预
  if (isFileError(lowerMessage)) {
    return {
      canRecover: false,
      retryDelay: 0,
      maxRetries: 0,
      action: "abort",
      userMessage: getFileErrorUserMessage(lowerMessage),
      technicalMessage: `File error: ${errorMessage}`,
    };
  }

  // 认证Error - 不可重试，需要配置修复
  if (isAuthenticationError(lowerMessage)) {
    return {
      canRecover: false,
      retryDelay: 0,
      maxRetries: 0,
      action: "abort",
      userMessage: "API密钥配置错误，请检查设置",
      technicalMessage: `Authentication error: ${errorMessage}`,
    };
  }

  // timeoutError - 可重试，但增加timeout时间
  if (isTimeoutError(lowerMessage)) {
    return {
      canRecover: true,
      retryDelay: calculateRetryDelay(context.attempt, 10000),
      maxRetries: 2,
      action: "retry",
      userMessage: "处理超时，正在重试...",
      technicalMessage: `Timeout error: ${errorMessage}`,
    };
  }

  // 未知Error - 有限重试
  return {
    canRecover: true,
    retryDelay: calculateRetryDelay(context.attempt, 8000),
    maxRetries: 2,
    action: "retry",
    userMessage: "遇到未知错误，正在尝试恢复...",
    technicalMessage: `Unknown error: ${errorMessage}`,
  };
}

function isNetworkError(message: string): boolean {
  return (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("connection") ||
    message.includes("failed to fetch") ||
    message.includes("econnrefused") ||
    message.includes("enotfound")
  );
}

function isRateLimitError(message: string): boolean {
  return (
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("quota exceeded") ||
    message.includes("429")
  );
}

function isTemporaryServerError(message: string): boolean {
  return (
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504") ||
    message.includes("bad gateway") ||
    message.includes("service unavailable") ||
    message.includes("gateway timeout")
  );
}

function isFileError(message: string): boolean {
  return (
    message.includes("file too large") ||
    message.includes("invalid format") ||
    message.includes("unsupported") ||
    message.includes("corrupted") ||
    message.includes("400")
  );
}

function isAuthenticationError(message: string): boolean {
  return (
    message.includes("api key") ||
    message.includes("unauthorized") ||
    message.includes("authentication") ||
    message.includes("401") ||
    message.includes("403")
  );
}

function isTimeoutError(message: string): boolean {
  return (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("abort") ||
    message.includes("408")
  );
}

function getFileErrorUserMessage(message: string): string {
  if (message.includes("too large")) {
    return "音频文件过大，请选择较小的文件（建议小于25MB）";
  }
  if (message.includes("format")) {
    return "音频格式不支持，请使用MP3、WAV或M4A格式";
  }
  if (message.includes("corrupted")) {
    return "音频文件损坏，请重新上传文件";
  }
  return "文件处理失败，请检查文件格式和大小";
}

function calculateRetryDelay(attempt: number, baseDelay: number): number {
  // 指数退避 + 随机抖动，避免雷群效应
  const exponentialDelay = baseDelay * 2 ** attempt;
  const jitter = Math.random() * 0.3 * exponentialDelay; // 30% 随机抖动
  return Math.min(exponentialDelay + jitter, 60000); // 最大delay60seconds
}

/** * Transcription重试管理器*/
export class TranscriptionRetryManager {
  private retryAttempts: Map<number, number> = new Map();
  private lastRetryTime: Map<number, number> = new Map();
  private failedOperations: Map<number, { error: unknown; timestamp: number }> = new Map();

  /** * Checkis否应该重试*/
  shouldRetry(fileId: number, strategy: RecoveryStrategy): boolean {
    if (strategy.action !== "retry") {
      return false;
    }

    const currentAttempts = this.retryAttempts.get(fileId) || 0;
    return currentAttempts < strategy.maxRetries;
  }

  /** * 增加重试计数*/
  incrementRetry(fileId: number): number {
    const current = this.retryAttempts.get(fileId) || 0;
    const newCount = current + 1;
    this.retryAttempts.set(fileId, newCount);
    this.lastRetryTime.set(fileId, Date.now());
    return newCount;
  }

  /** * 重置重试计数*/
  resetRetry(fileId: number): void {
    this.retryAttempts.delete(fileId);
    this.lastRetryTime.delete(fileId);
    this.failedOperations.delete(fileId);
  }

  /** * recordFailedoperations*/
  recordFailure(fileId: number, error: unknown): void {
    this.failedOperations.set(fileId, {
      error,
      timestamp: Date.now(),
    });
  }

  /** * Get重试delay*/
  getRetryDelay(fileId: number, strategy: RecoveryStrategy): number {
    const attempt = this.retryAttempts.get(fileId) || 0;
    const lastRetry = this.lastRetryTime.get(fileId) || 0;
    const timeSinceLastRetry = Date.now() - lastRetry;

    // 计算建议delay
    const suggestedDelay = calculateRetryDelay(attempt, strategy.retryDelay);

    // If距离上次重试时间太短，使用剩余等待时间
    if (timeSinceLastRetry < suggestedDelay) {
      return suggestedDelay - timeSinceLastRetry;
    }

    return suggestedDelay;
  }

  /** * GetFailed信息*/
  getFailureInfo(fileId: number): { error: unknown; timestamp: number } | null {
    return this.failedOperations.get(fileId) || null;
  }

  /** * 清理过期Failedrecord*/
  cleanup(olderThanMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - olderThanMs;

    for (const [fileId, info] of this.failedOperations) {
      if (info.timestamp < cutoff) {
        this.failedOperations.delete(fileId);
        this.retryAttempts.delete(fileId);
        this.lastRetryTime.delete(fileId);
      }
    }
  }

  /** * Get重试统计*/
  getRetryStats(fileId: number): {
    attempts: number;
    lastRetryTime: number | null;
    hasRecentFailure: boolean;
  } {
    return {
      attempts: this.retryAttempts.get(fileId) || 0,
      lastRetryTime: this.lastRetryTime.get(fileId) || null,
      hasRecentFailure: this.failedOperations.has(fileId),
    };
  }
}

// 全局重试管理器实例
export const globalRetryManager = new TranscriptionRetryManager();

/** * 智能重试函数 * 带有Error分class和恢复策略重试机制*/
export async function smartRetry<T>(
  operation: () => Promise<T>,
  context: TranscriptionErrorContext,
): Promise<T> {
  const retryManager = globalRetryManager;

  // 重置重试计数（If这i新尝试）
  if (context.attempt === 0) {
    retryManager.resetRetry(context.fileId);
  }

  while (true) {
    try {
      const result = await operation();

      // operationsSuccess，清理重试state
      retryManager.resetRetry(context.fileId);
      return result;
    } catch (error) {
      // 分classError
      const strategy = classifyError(error, context);

      // recordFailed
      retryManager.recordFailure(context.fileId, error);

      // Checkis否应该重试
      if (!retryManager.shouldRetry(context.fileId, strategy)) {
        throw error;
      }

      // 增加重试计数
      const attempt = retryManager.incrementRetry(context.fileId);

      console.warn(
        `操作失败，准备重试 (${attempt}/${strategy.maxRetries}): ${strategy.userMessage}`,
        { fileId: context.fileId, error },
      );

      // 等待重试delay
      const delay = retryManager.getRetryDelay(context.fileId, strategy);
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // Update上下文in尝试次数
      context.attempt = attempt;
      context.maxAttempts = strategy.maxRetries;
    }
  }
}

/** * 定期清理过期record*/
setInterval(
  () => {
    globalRetryManager.cleanup();
  },
  60 * 60 * 1000,
); // 每hours清理一次
