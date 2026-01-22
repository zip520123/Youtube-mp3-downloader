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
   * Start audio extraction asynchronously and return fileId immediately
   */
  static async startExtraction(url: string): Promise<{ fileId: string; metadata: any }> {
    try {
      // First, validate URL and get metadata
      if (!YouTubeService.validateUrl(url)) {
        const err = new Error('Please provide a valid YouTube URL');
        (err as any).code = ErrorCode.INVALID_URL;
        throw err;
      }

      Logger.info(`Starting audio extraction for: ${url}`);

      // Generate unique file ID first
      const fileId = uuidv4();

      // Update progress: Fetching metadata
      progressTracker.updateProgress(fileId, {
        stage: 'metadata',
        progress: 10,
        message: 'Fetching video information...'
      });

      // Get video metadata using yt-dlp
      const metadata = await YouTubeService.getMetadata(url);

      // Start extraction in background (don't await)
      this.processExtraction(url, fileId, metadata).catch((error) => {
        Logger.error(`Background extraction failed for ${fileId}`, error);
      });

      // Return immediately with fileId and metadata
      return { fileId, metadata };

    } catch (error: any) {
      Logger.error('Error starting extraction', error);

      // If error already has a code, re-throw it
      if (error.code) {
        throw error;
      }

      // Otherwise, throw generic extraction failed error
      const err = new Error('Failed to start extraction. Please try again');
      (err as any).code = ErrorCode.EXTRACTION_FAILED;
      throw err;
    }
  }

  /**
   * Process the actual extraction (runs in background)
   */
  private static async processExtraction(url: string, fileId: string, metadata: any): Promise<void> {
    try {
      // Update progress: Starting download
      progressTracker.updateProgress(fileId, {
        stage: 'downloading',
        progress: 30,
        message: 'Downloading audio...'
      });

      const outputPath = path.join(config.tempDir, `${fileId}.mp3`);

      // Download and convert audio using yt-dlp
      await YtDlpAudioService.downloadAudio(url, outputPath, fileId);

      // Register file for cleanup FIRST
      FileCleanupService.registerFile(fileId, outputPath, metadata.title);

      Logger.info(`Audio extraction completed: ${fileId}`);

      // Update progress: Completed (do this AFTER file is registered)
      progressTracker.updateProgress(fileId, {
        stage: 'completed',
        progress: 100,
        message: 'Complete! Ready to download'
      });

      // Clear progress after a delay
      setTimeout(() => progressTracker.clearProgress(fileId), 60000);

    } catch (error: any) {
      Logger.error('Error processing extraction', error);

      // Update progress with error
      progressTracker.updateProgress(fileId, {
        stage: 'error',
        progress: 0,
        message: 'Extraction failed',
        error: error.message
      });
    }
  }

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

      // Register file for cleanup FIRST
      FileCleanupService.registerFile(fileId, outputPath, metadata.title);

      Logger.info(`Audio extraction completed: ${fileId}`);

      // Update progress: Completed (do this AFTER file is registered)
      progressTracker.updateProgress(fileId, {
        stage: 'completed',
        progress: 100,
        message: 'Complete! Ready to download'
      });

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
