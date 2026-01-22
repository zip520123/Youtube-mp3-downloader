import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';
import { Logger } from './logger.util';
import { FileMetadata } from '../types';

export class FileCleanupService {
  private static fileRegistry = new Map<string, FileMetadata>();
  private static cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Start scheduled cleanup task
   */
  static startCleanupSchedule(): void {
    // Clean up on start
    this.cleanupOldFiles();

    // Schedule periodic cleanup every 30 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldFiles();
    }, 30 * 60 * 1000);

    Logger.info('File cleanup scheduler started');
  }

  /**
   * Stop scheduled cleanup task
   */
  static stopCleanupSchedule(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      Logger.info('File cleanup scheduler stopped');
    }
  }

  /**
   * Register a new file in the registry
   */
  static registerFile(fileId: string, filePath: string, videoTitle: string): void {
    this.fileRegistry.set(fileId, {
      fileId,
      filePath,
      createdAt: new Date(),
      videoTitle
    });
    Logger.debug(`File registered: ${fileId}`);
  }

  /**
   * Get file metadata by ID
   */
  static getFileMetadata(fileId: string): FileMetadata | undefined {
    return this.fileRegistry.get(fileId);
  }

  /**
   * Clean up old files based on retention policy
   */
  static async cleanupOldFiles(): Promise<void> {
    try {
      const now = Date.now();
      const retentionMs = config.fileRetentionMinutes * 60 * 1000;
      let deletedCount = 0;

      // Clean files from registry
      for (const [fileId, metadata] of this.fileRegistry.entries()) {
        const age = now - metadata.createdAt.getTime();
        if (age > retentionMs) {
          await this.deleteFile(fileId);
          deletedCount++;
        }
      }

      // Also clean orphaned files in temp directory
      const tempDir = path.resolve(config.tempDir);
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        for (const file of files) {
          if (file === '.gitkeep') continue;

          const filePath = path.join(tempDir, file);
          const stats = fs.statSync(filePath);
          const age = now - stats.mtimeMs;

          if (age > retentionMs) {
            fs.unlinkSync(filePath);
            Logger.info(`Deleted orphaned file: ${file}`);
            deletedCount++;
          }
        }
      }

      if (deletedCount > 0) {
        Logger.info(`Cleanup completed: ${deletedCount} files deleted`);
      }
    } catch (error) {
      Logger.error('Error during file cleanup', error as Error);
    }
  }

  /**
   * Delete a specific file by ID
   */
  static async deleteFile(fileId: string): Promise<void> {
    try {
      const metadata = this.fileRegistry.get(fileId);
      if (metadata) {
        if (fs.existsSync(metadata.filePath)) {
          fs.unlinkSync(metadata.filePath);
          Logger.info(`Deleted file: ${fileId}`);
        }
        this.fileRegistry.delete(fileId);
      }
    } catch (error) {
      Logger.error(`Error deleting file ${fileId}`, error as Error);
      throw error;
    }
  }

  /**
   * Clean up all temp files on server start
   */
  static async cleanupAllTempFiles(): Promise<void> {
    try {
      const tempDir = path.resolve(config.tempDir);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
        return;
      }

      const files = fs.readdirSync(tempDir);
      let deletedCount = 0;

      for (const file of files) {
        if (file === '.gitkeep') continue;

        const filePath = path.join(tempDir, file);
        fs.unlinkSync(filePath);
        deletedCount++;
      }

      this.fileRegistry.clear();
      Logger.info(`Startup cleanup: ${deletedCount} files deleted`);
    } catch (error) {
      Logger.error('Error during startup cleanup', error as Error);
    }
  }
}
