/** * 统一Filestate枚举*/
export enum FileStatus {
  UPLOADED = "uploaded", // 已upload，待Transcription
  TRANSCRIBING = "transcribing", // Transcriptionin
  COMPLETED = "completed", // Transcription完成
  ERROR = "error", // TranscriptionFailed
}

export interface FileRow {
  id?: number;
  name: string;
  size: number;
  type: string;
  blob?: Blob; // 对于大File，此field可能a空
  isChunked?: boolean; // i否使用分块存储
  chunkSize?: number; // 每个分块size
  totalChunks?: number; // 总分块数
  duration?: number;
  uploadedAt: Date; // 与database schema 保持一致
  updatedAt: Date;
  // 注意: state完全由 TranscriptRow.status 管理，不再存储在 FileRow
}

export interface TranscriptRow {
  id?: number;
  fileId: number;
  status: "pending" | "processing" | "completed" | "failed";
  rawText?: string;
  text?: string;
  language?: string;
  duration?: number;
  error?: string;
  processingTime?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AudioPlayerState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface Segment {
  id?: number;
  transcriptId: number;
  start: number;
  end: number;
  text: string;
  normalizedText?: string;
  translation?: string;
  romaji?: string;
  annotations?: string[];
  furigana?: string;
  wordTimestamps?: WordTimestamp[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FileWithTranscripts extends FileRow {
  transcripts: TranscriptRow[];
}

export interface TranscriptWithSegments extends TranscriptRow {
  segments: Segment[];
}

export type ProcessingStatus = "pending" | "processing" | "completed" | "failed";

export interface DatabaseStats {
  totalFiles: number;
  totalTranscripts: number;
  totalSegments: number;
  processingStatus: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
}
