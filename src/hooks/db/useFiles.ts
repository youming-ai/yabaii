/** * SimplifiedFile管理hook * RemovedcomplexFileupload逻辑，keep基本functionality*/

import { useCallback, useEffect, useState } from "react";
import { DBUtils } from "@/lib/db/db";
import type { FileRow } from "@/types/db/database";

export interface UseFilesReturn {
  files: FileRow[];
  isLoading: boolean;
  loadFiles: () => Promise<void>;
  refreshFiles: () => Promise<void>;
  addFiles: (files: File[]) => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;
  error: string | null;
}

export function useFiles(): UseFilesReturn {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const allFiles = await DBUtils.getAllFiles();
      setFiles(allFiles);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "加载文件失败";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshFiles = useCallback(async () => {
    await loadFiles();
  }, [loadFiles]);

  const addFiles = useCallback(
    async (newFiles: File[]) => {
      try {
        setError(null);

        for (const file of newFiles) {
          const now = new Date();
          const fileRow: Omit<FileRow, "id"> = {
            name: file.name,
            size: file.size,
            type: file.type,
            blob: file,
            isChunked: false,
            uploadedAt: now, // 使用database schema in定义field名
            updatedAt: now,
          };

          await DBUtils.addFile(fileRow);
        }

        await loadFiles();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "添加文件失败";
        setError(errorMessage);
        throw err;
      }
    },
    [loadFiles],
  );

  const deleteFile = useCallback(
    async (fileId: string) => {
      try {
        setError(null);
        const id = parseInt(fileId, 10);
        if (!Number.isNaN(id)) {
          await DBUtils.deleteFile(id);
          await loadFiles(); // 重新加载File列table
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "删除文件失败";
        setError(errorMessage);
        throw err;
      }
    },
    [loadFiles],
  );

  // 初始加载
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  return {
    files,
    isLoading,
    loadFiles,
    refreshFiles,
    addFiles,
    deleteFile,
    error,
  };
}
