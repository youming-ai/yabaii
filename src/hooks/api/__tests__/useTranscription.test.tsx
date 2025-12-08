import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTranscription, useTranscriptionStatus } from "../useTranscription";

// Mock dependencies
vi.mock("@/lib/db/db", () => ({
  DBUtils: {
    findTranscriptByFileId: vi.fn(),
    getSegmentsByTranscriptIdOrdered: vi.fn(),
    getFile: vi.fn(),
  },
  db: {
    segments: {
      where: vi.fn(() => ({
        modify: vi.fn(),
      })),
    },
    transcripts: {
      where: vi.fn(() => ({
        first: vi.fn(),
      })),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/utils/transcription-error-handler", () => ({
  handleTranscriptionError: vi.fn(),
  handleTranscriptionSuccess: vi.fn(),
}));

describe("useTranscription Hook", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe("useTranscriptionStatus", () => {
    it("should return transcript and segments when they exist", async () => {
      const mockTranscript = {
        id: 1,
        fileId: 1,
        status: "completed",
        language: "en",
        processingTime: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSegments = [
        {
          id: 1,
          transcriptId: 1,
          start: 0,
          end: 3,
          text: "Hello world",
          wordTimestamps: [],
          normalizedText: "Hello world",
          translation: "你好世界",
          annotations: [],
          furigana: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(require("@/lib/db/db").DBUtils.findTranscriptByFileId).mockResolvedValue(
        mockTranscript,
      );
      vi.mocked(require("@/lib/db/db").DBUtils.getSegmentsByTranscriptIdOrdered).mockResolvedValue(
        mockSegments,
      );

      const { result } = renderHook(() => useTranscriptionStatus(1), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual({
          transcript: mockTranscript,
          segments: mockSegments,
        });
      });
    });

    it("should return null when no transcript exists", async () => {
      vi.mocked(require("@/lib/db/db").DBUtils.findTranscriptByFileId).mockResolvedValue(undefined);

      const { result } = renderHook(() => useTranscriptionStatus(1), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual({
          transcript: null,
          segments: [],
        });
      });
    });

    it("should use cached data for 15 minutes", () => {
      vi.mocked(require("@/lib/db/db").DBUtils.findTranscriptByFileId).mockResolvedValue(undefined);
      vi.mocked(require("@/lib/db/db").DBUtils.getSegmentsByTranscriptIdOrdered).mockResolvedValue(
        [],
      );

      const { result } = renderHook(() => useTranscriptionStatus(1), { wrapper });

      expect(result.current.options.staleTime).toBe(1000 * 60 * 15); // 15 minutes
    });
  });

  describe("useTranscription", () => {
    const mockFile = {
      id: 1,
      name: "test.mp3",
      size: 1024,
      type: "audio/mpeg",
      blob: new Blob(["test"], { type: "audio/mpeg" }),
      uploadedAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      vi.mocked(require("@/lib/db/db").DBUtils.getFile).mockResolvedValue(mockFile);

      // Mock fetch
      global.fetch = vi.fn();
    });

    it("should start transcription successfully", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            status: "completed",
            text: "Transcribed text",
            language: "en",
            duration: 10,
            segments: [
              {
                start: 0,
                end: 3,
                text: "Hello world",
                wordTimestamps: [],
                confidence: 0.95,
              },
            ],
          },
        }),
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      // Mock successful database operations
      vi.mocked(require("@/lib/db/db").DBUtils.getSegmentsByTranscriptIdOrdered).mockResolvedValue(
        [],
      );

      const { result } = renderHook(() => useTranscription(), { wrapper });

      await waitFor(async () => {
        const promise = result.current.mutateAsync({
          fileId: 1,
          language: "en",
        });
        await expect(promise).resolves.toBeDefined();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/transcribe?fileId=1&language=en"),
        expect.objectContaining({
          method: "POST",
          body: expect.any(FormData),
        }),
      );
    });

    it("should handle transcription errors", async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: async () => ({
          message: "Internal server error",
        }),
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useTranscription(), { wrapper });

      await waitFor(async () => {
        try {
          await result.current.mutateAsync({
            fileId: 1,
            language: "en",
          });
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      });

      expect(
        require("@/lib/utils/transcription-error-handler").handleTranscriptionError,
      ).toHaveBeenCalled();
    });

    it("should retry failed requests", async () => {
      const mockFailResponse = {
        ok: false,
        status: 503,
        json: async () => ({
          message: "Service unavailable",
        }),
      };

      const mockSuccessResponse = {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            status: "completed",
            text: "Success after retry",
            language: "en",
            duration: 5,
            segments: [],
          },
        }),
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce(mockFailResponse as any)
        .mockResolvedValueOnce(mockSuccessResponse as any);

      vi.mocked(require("@/lib/db/db").DBUtils.getSegmentsByTranscriptIdOrdered).mockResolvedValue(
        [],
      );

      const { result } = renderHook(() => useTranscription(), { wrapper });

      await waitFor(async () => {
        await result.current.mutateAsync({
          fileId: 1,
          language: "en",
          maxRetries: 2,
        });
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("should handle file not found error", async () => {
      vi.mocked(require("@/lib/db/db").DBUtils.getFile).mockResolvedValue(undefined);

      const { result } = renderHook(() => useTranscription(), { wrapper });

      await waitFor(async () => {
        try {
          await result.current.mutateAsync({
            fileId: 999,
            language: "en",
          });
        } catch (error) {
          expect(error.message).toBe("File not found or file data is corrupted");
        }
      });
    });

    it("should handle transcription cancellation", async () => {
      const abortController = new AbortController();

      vi.mocked(global.fetch).mockImplementation(() => {
        return new Promise((resolve, reject) => {
          abortController.signal.addEventListener("abort", () => {
            reject(new DOMException("Request aborted", "AbortError"));
          });
        });
      });

      const { result } = renderHook(() => useTranscription(), { wrapper });

      const promise = result.current.mutateAsync({
        fileId: 1,
        language: "en",
        signal: abortController.signal,
      });

      // Abort the request
      abortController.abort();

      await waitFor(async () => {
        try {
          await promise;
        } catch (error) {
          expect(error).toBeInstanceOf(DOMException);
          expect(error.name).toBe("AbortError");
        }
      });
    });
  });
});
