export interface VideoMetadata {
  title: string;
  duration: number;
  thumbnail: string;
  url: string;
}

export interface AudioExtractionResult {
  fileId: string;
  filePath: string;
  metadata: VideoMetadata;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export enum ErrorCode {
  INVALID_URL = 'INVALID_URL',
  VIDEO_UNAVAILABLE = 'VIDEO_UNAVAILABLE',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR'
}

export interface FileMetadata {
  fileId: string;
  filePath: string;
  createdAt: Date;
  videoTitle: string;
}
