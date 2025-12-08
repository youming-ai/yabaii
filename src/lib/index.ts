/** * 统一导入indexFile * 减少项目in重复导入语句*/

export type {
  FileRow,
  FileStatus,
  Segment,
  TranscriptRow,
} from "../types/db/database";
// database相关
export { db } from "./db/db";
// API 相关
export { apiError, apiFromError, apiSuccess } from "./utils/api-response";
// ErrorProcess相关
export { handleError, logError } from "./utils/error-handler";
export {
  handleTranscriptionError,
  handleTranscriptionProgress,
  handleTranscriptionSuccess,
  type TranscriptionErrorContext,
} from "./utils/transcription-error-handler";

// 常量相关
export const API_ENDPOINTS = {
  TRANSCRIBE: "/api/transcribe",
  POSTPROCESS: "/api/postprocess",
  HEALTH: "/api/health",
  PROGRESS: "/api/progress",
} as const;

export const CACHE_TIMES = {
  DEFAULT: 5 * 60 * 1000, // 5minutes
  LONG: 15 * 60 * 1000, // 15minutes
  SHORT: 60 * 1000, // 1minutes
} as const;

export const SUPPORTED_AUDIO_FORMATS = [
  "audio/mp3",
  "audio/wav",
  "audio/m4a",
  "audio/mpeg",
  "audio/x-m4a",
] as const;

export const TRANSCRIPTION_LANGUAGES = {
  JAPANESE: "ja",
  ENGLISH: "en",
  CHINESE: "zh",
  KOREAN: "ko",
} as const;
