import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AudioExtractionResult, ErrorCode } from '../types';
import { config } from '../config';
import { Logger } from '../utils/logger.util';
import { YouTubeService } from './youtube.service';
import { FileCleanupService } from '../utils/file-cleanup.util';
import { YtDlpAudioService } from './ytdlp-audio.service';
import { progressTracker } from '../utils/progress.util';

export class AudioService {
  /**
   * Extract audio from YouTube video and convert to MP3
   */
  static async extractAudio(url: string): Promise<AudioExtractionResult> {
    let fileId: string | undefined;

    try {
      // First, validate URL and get metadata
      if (!YouTubeService.validateUrl(url)) {
        const err = new Error('Please provide a valid YouTube URL');
        (err as any).code = ErrorCode.INVALID_URL;
        throw err;
      }

      Logger.info(`Starting audio extraction for: ${url}`);

      // Generate unique file ID first
      fileId = uuidv4();

      // Update progress: Fetching metadata
      progressTracker.updateProgress(fileId, {
        stage: 'metadata',
        progress: 10,
        message: 'Fetching video information...'
      });

      // Get video metadata using yt-dlp
      const metadata = await YouTubeService.getMetadata(url);

      // Update progress: Starting download
      progressTracker.updateProgress(fileId, {
        stage: 'downloading',
        progress: 30,
        message: 'Downloading audio...'
      });

      const outputPath = path.join(config.tempDir, `${fileId}.mp3`);

      // Download and convert audio using yt-dlp
      await YtDlpAudioService.downloadAudio(url, outputPath, fileId);

      // Update progress: Completed
      progressTracker.updateProgress(fileId, {
        stage: 'completed',
        progress: 100,
        message: 'Complete! Ready to download'
      });

      // Register file for cleanup
      FileCleanupService.registerFile(fileId, outputPath, metadata.title);

      Logger.info(`Audio extraction completed: ${fileId}`);

      // Clear progress after a delay
      const capturedFileId = fileId;
      setTimeout(() => progressTracker.clearProgress(capturedFileId), 60000);

      return {
        fileId,
        filePath: outputPath,
        metadata
      };

    } catch (error: any) {
      Logger.error('Error extracting audio', error);

      // Update progress with error if fileId exists
      if (fileId) {
        progressTracker.updateProgress(fileId, {
          stage: 'error',
          progress: 0,
          message: 'Extraction failed',
          error: error.message
        });
      }

      // If error already has a code, re-throw it
      if (error.code) {
        throw error;
      }

      // Otherwise, throw generic extraction failed error
      const err = new Error('Failed to extract audio. Please try again');
      (err as any).code = ErrorCode.EXTRACTION_FAILED;
      throw err;
    }
  }

}
