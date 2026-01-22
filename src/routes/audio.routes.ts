import { Router, Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import { AudioService } from '../services/audio.service';
import { FileCleanupService } from '../utils/file-cleanup.util';
import { validateExtractRequest } from '../middleware/validation.middleware';
import { Logger } from '../utils/logger.util';
import { ErrorCode } from '../types';
import { progressTracker } from '../utils/progress.util';

export const audioRouter = Router();

/**
 * POST /api/extract-audio
 * Extract audio from YouTube URL
 */
audioRouter.post(
  '/extract-audio',
  validateExtractRequest,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { url } = req.body;

      Logger.info(`Extract audio request: ${url}`);

      // Extract audio
      const result = await AudioService.extractAudio(url);

      // Return response with download URL
      res.json({
        success: true,
        data: {
          fileId: result.fileId,
          title: result.metadata.title,
          duration: result.metadata.duration,
          thumbnail: result.metadata.thumbnail,
          downloadUrl: `/api/download/${result.fileId}`
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/download/:fileId
 * Download MP3 file by file ID
 */
audioRouter.get(
  '/download/:fileId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fileId } = req.params;

      Logger.info(`Download request: ${fileId}`);

      // Get file metadata
      const metadata = FileCleanupService.getFileMetadata(fileId);

      if (!metadata) {
        const err = new Error('File not found or has expired');
        (err as any).code = ErrorCode.FILE_NOT_FOUND;
        throw err;
      }

      // Check if file exists
      if (!fs.existsSync(metadata.filePath)) {
        const err = new Error('File not found or has expired');
        (err as any).code = ErrorCode.FILE_NOT_FOUND;
        throw err;
      }

      // Sanitize filename for download
      const sanitizedTitle = metadata.videoTitle
        .replace(/[^a-z0-9]/gi, '_')
        .substring(0, 100);
      const filename = `${sanitizedTitle}.mp3`;

      // Set response headers
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Stream file to response
      const fileStream = fs.createReadStream(metadata.filePath);
      fileStream.pipe(res);

      fileStream.on('end', () => {
        Logger.info(`Download completed: ${fileId}`);
        // Optionally delete file after download
        // FileCleanupService.deleteFile(fileId);
      });

      fileStream.on('error', (error) => {
        Logger.error(`Error streaming file ${fileId}`, error);
        next(error);
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/progress/:fileId
 * Server-Sent Events endpoint for progress updates
 */
audioRouter.get('/progress/:fileId', (req: Request, res: Response): void => {
  const { fileId } = req.params;

  Logger.info(`Progress stream requested for: ${fileId}`);

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ connected: true })}\n\n`);

  // Send current progress if it exists
  const currentProgress = progressTracker.getProgress(fileId);
  if (currentProgress) {
    res.write(`data: ${JSON.stringify(currentProgress)}\n\n`);
  }

  // Subscribe to progress updates
  const unsubscribeProgress = progressTracker.onProgress(fileId, (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  });

  // Subscribe to completion event
  const unsubscribeComplete = progressTracker.onComplete(fileId, () => {
    res.write(`data: ${JSON.stringify({ stage: 'done' })}\n\n`);
    res.end();
  });

  // Cleanup on client disconnect
  req.on('close', () => {
    Logger.info(`Progress stream closed for: ${fileId}`);
    unsubscribeProgress();
    unsubscribeComplete();
  });
});

/**
 * GET /api/health
 * Health check endpoint
 */
audioRouter.get('/health', (_req: Request, res: Response): void => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString()
    }
  });
});
