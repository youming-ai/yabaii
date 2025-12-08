/** * 智能Cache管理器 * 优化TanStack QueryCache失效策略，减少不必要网络request*/

import type { QueryClient } from "@tanstack/react-query";
import { transcriptionKeys } from "@/hooks/api/useTranscription";
import { playerKeys } from "@/hooks/player/usePlayerDataQuery";
import { fileStatusKeys } from "@/hooks/useFileStatus";

/** * Cache失效策略枚举*/
export enum CacheInvalidationStrategy {
  IMMEDIATE = "immediate", // 立即失效
  DELAYED = "delayed", // delay失效
  SELECTIVE = "selective", // 选择性失效
  OPTIMISTIC = "optimistic", // 乐观Update
}

/** * Cacheoperationsclass型*/
export interface CacheOperation {
  type: "invalidate" | "update" | "remove" | "prefetch";
  queryKey: readonly any[];
  strategy: CacheInvalidationStrategy;
  delay?: number;
  data?: any;
}

/** * 智能Cache管理器*/
export class SmartCacheManager {
  private queryClient: QueryClient;
  private pendingInvalidations: Map<string, NodeJS.Timeout> = new Map();
  private batchOperations: CacheOperation[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /** * 智能File相关Cache失效 * 根据operationsclass型选择最合适失效策略*/
  invalidateFileRelated(fileId: number, operation: "transcribe" | "update" | "delete"): void {
    const operations: CacheOperation[] = [];

    // 基于operationsclass型构建Cache失效策略
    switch (operation) {
      case "transcribe":
        operations.push(
          // 立即失效Filestate
          {
            type: "invalidate",
            queryKey: fileStatusKeys.forFile(fileId),
            strategy: CacheInvalidationStrategy.IMMEDIATE,
          },
          // delay失效Transcriptionstate（避免重复request）
          {
            type: "invalidate",
            queryKey: transcriptionKeys.forFile(fileId),
            strategy: CacheInvalidationStrategy.DELAYED,
            delay: 1000,
          },
          // 选择性失效播放器数据
          {
            type: "invalidate",
            queryKey: playerKeys.file(fileId),
            strategy: CacheInvalidationStrategy.SELECTIVE,
          },
        );
        break;

      case "update":
        operations.push(
          // 乐观UpdateFilestate
          {
            type: "update",
            queryKey: fileStatusKeys.forFile(fileId),
            strategy: CacheInvalidationStrategy.OPTIMISTIC,
          },
          // delay失效播放器数据
          {
            type: "invalidate",
            queryKey: playerKeys.file(fileId),
            strategy: CacheInvalidationStrategy.DELAYED,
            delay: 500,
          },
        );
        break;

      case "delete":
        operations.push(
          // 立即Removed所有相关Cache
          {
            type: "remove",
            queryKey: fileStatusKeys.forFile(fileId),
            strategy: CacheInvalidationStrategy.IMMEDIATE,
          },
          {
            type: "remove",
            queryKey: transcriptionKeys.forFile(fileId),
            strategy: CacheInvalidationStrategy.IMMEDIATE,
          },
          {
            type: "remove",
            queryKey: playerKeys.file(fileId),
            strategy: CacheInvalidationStrategy.IMMEDIATE,
          },
        );
        break;
    }

    // batch执行operations
    this.batchExecuteOperations(operations);
  }

  /** * batch失效多个FileCache * 优化大量Filestate变更时性能*/
  invalidateMultipleFiles(fileIds: number[], operation: "transcribe" | "update" | "delete"): void {
    if (fileIds.length === 0) return;

    console.log(`🔄 批量缓存失效: ${fileIds.length} files, 操作: ${operation}`);

    // 对于大量File，使用全局列table失效而不i逐个失效
    if (fileIds.length > 10) {
      this.batchExecuteOperations([
        {
          type: "invalidate",
          queryKey: fileStatusKeys.all,
          strategy: CacheInvalidationStrategy.IMMEDIATE,
        },
        {
          type: "invalidate",
          queryKey: transcriptionKeys.all,
          strategy: CacheInvalidationStrategy.DELAYED,
          delay: 1500,
        },
      ]);
      return;
    }

    // 少量File逐个Process
    fileIds.forEach((fileId) => {
      this.invalidateFileRelated(fileId, operation);
    });
  }

  /** * 乐观UpdateCache * 在等待serverresponse时立即UpdateUI*/
  optimisticUpdate<T>(queryKey: any[], newData: T, rollbackData: T, promise: Promise<any>): void {
    // 立即UpdateCache
    this.queryClient.setQueryData(queryKey, newData);

    // IfPromiseFailed，回滚数据
    promise.catch(() => {
      console.warn("乐观更新失败，回滚数据", queryKey);
      this.queryClient.setQueryData(queryKey, rollbackData);
    });
  }

  /** * 预取相关数据 * 在用户可能需要数据之前提前加载*/
  async prefetchRelatedData(fileId: number): Promise<void> {
    try {
      // 并行预取相关数据
      await Promise.all([
        this.queryClient.prefetchQuery({
          queryKey: fileStatusKeys.forFile(fileId),
          staleTime: 1000 * 60 * 2, // 2minutes
        }),
        this.queryClient.prefetchQuery({
          queryKey: transcriptionKeys.forFile(fileId),
          staleTime: 1000 * 60 * 5, // 5minutes
        }),
      ]);
    } catch (error) {
      console.warn("预取数据失败:", error);
    }
  }

  /** * 智能Cache清理 * 基于使用模式清理过期或低价值Cache*/
  cleanupSmartCache(): void {
    const cache = this.queryClient.getQueryCache().getAll();
    const now = Date.now();

    // 清理超过1hours未访问Cache
    const staleThreshold = 60 * 60 * 1000; // 1hours

    cache.forEach((query) => {
      if (query.state.dataUpdatedAt && now - query.state.dataUpdatedAt > staleThreshold) {
        this.queryClient.removeQueries({ queryKey: query.queryKey });
      }
    });

    // 清理FailedQueryCache
    this.queryClient.removeQueries({
      predicate: (query) =>
        query.state.status === "error" && now - (query.state.dataUpdatedAt || 0) > 10 * 60 * 1000, // 10minutes前Error
    });

    console.log("🧹 智能缓存清理完成");
  }

  /** * batch执行Cacheoperations * 将多个operations合并执行，减少重复计算*/
  private batchExecuteOperations(operations: CacheOperation[]): void {
    this.batchOperations.push(...operations);

    // If已有待Process批次，delay执行
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    // 100ms后执行批次operations
    this.batchTimeout = setTimeout(() => {
      this.executeBatchOperations();
    }, 100);
  }

  /** * 执行batchCacheoperations*/
  private executeBatchOperations(): void {
    const operations = this.batchOperations.splice(0);

    // 按class型分组operations
    const groupedOperations = operations.reduce(
      (groups, op) => {
        const key = `${op.type}-${op.strategy}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(op);
        return groups;
      },
      {} as Record<string, CacheOperation[]>,
    );

    // 执行分组operations
    Object.values(groupedOperations).forEach((group) => {
      this.executeOperationGroup(group);
    });

    this.batchTimeout = null;
  }

  /** * 执行一组operations*/
  private executeOperationGroup(operations: CacheOperation[]): void {
    operations.forEach((operation) => {
      const { type, queryKey, strategy, delay = 0, data } = operation;

      switch (strategy) {
        case CacheInvalidationStrategy.IMMEDIATE:
          this.executeOperation(type, queryKey, data);
          break;

        case CacheInvalidationStrategy.DELAYED:
          this.scheduleDelayedOperation(type, queryKey, delay, data);
          break;

        case CacheInvalidationStrategy.SELECTIVE:
          this.executeSelectiveOperation(type, queryKey, data);
          break;

        case CacheInvalidationStrategy.OPTIMISTIC:
          if (data) {
            this.queryClient.setQueryData(queryKey, data);
          }
          break;
      }
    });
  }

  /** * 执行单个Cacheoperations*/
  private executeOperation(type: string, queryKey: readonly any[], data?: any): void {
    switch (type) {
      case "invalidate":
        this.queryClient.invalidateQueries({ queryKey });
        break;
      case "update":
        if (data) {
          this.queryClient.setQueryData(queryKey, data);
        }
        break;
      case "remove":
        this.queryClient.removeQueries({ queryKey });
        break;
      case "prefetch":
        // prefetch需要具体实现，这里暂时忽略
        break;
    }
  }

  /** * 调度delayoperations*/
  private scheduleDelayedOperation(
    type: string,
    queryKey: readonly any[],
    delay: number,
    data?: any,
  ): void {
    const key = JSON.stringify(queryKey);

    // 取消已有delayoperations
    if (this.pendingInvalidations.has(key)) {
      clearTimeout(this.pendingInvalidations.get(key)!);
    }

    // 调度新delayoperations
    const timeout = setTimeout(() => {
      this.executeOperation(type, queryKey, data);
      this.pendingInvalidations.delete(key);
    }, delay);

    this.pendingInvalidations.set(key, timeout);
  }

  /** * 执行选择性operations * 基于Cachestate决定i否执行operations*/
  private executeSelectiveOperation(type: string, queryKey: readonly any[], data?: any): void {
    const query = this.queryClient.getQueryCache().find({ queryKey });

    // IfCacheis新鲜，跳过失效
    if (query && !query.isStale()) {
      return;
    }

    this.executeOperation(type, queryKey, data);
  }

  /** * GetCache统计信息*/
  getCacheStats(): {
    totalQueries: number;
    activeQueries: number;
    staleQueries: number;
    errorQueries: number;
  } {
    const cache = this.queryClient.getQueryCache().getAll();

    return {
      totalQueries: cache.length,
      activeQueries: cache.filter((q) => q.state.fetchStatus === "fetching").length,
      staleQueries: cache.filter((q) => q.isStale()).length,
      errorQueries: cache.filter((q) => q.state.status === "error").length,
    };
  }

  /** * 清理所有delayoperations*/
  destroy(): void {
    // 清理delayoperations
    this.pendingInvalidations.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.pendingInvalidations.clear();

    // 清理批次operations
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    this.batchOperations = [];
  }
}

/** * 创建Cache管理器实例*/
export function createCacheManager(queryClient: QueryClient): SmartCacheManager {
  return new SmartCacheManager(queryClient);
}

/** * 全局Cache管理器实例*/
let globalCacheManager: SmartCacheManager | null = null;

/** * Get全局Cache管理器*/
export function getCacheManager(queryClient?: QueryClient): SmartCacheManager {
  if (!globalCacheManager && queryClient) {
    globalCacheManager = createCacheManager(queryClient);
  }

  if (!globalCacheManager) {
    throw new Error("Cache manager not initialized. Call getCacheManager(queryClient) first.");
  }

  return globalCacheManager;
}

/** * 定期清理Cache*/
setInterval(
  () => {
    try {
      const manager = getCacheManager();
      manager.cleanupSmartCache();
    } catch (_error) {
      // 忽略未初始化Error
    }
  },
  10 * 60 * 1000,
); // 每10minutes清理一次
