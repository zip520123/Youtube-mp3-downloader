import { execFile } from 'child_process';
import { promisify } from 'util';
import { VideoMetadata, ErrorCode } from '../types';
import { Logger } from '../utils/logger.util';
import { getYtDlpCommand, getYtDlpMetadataArgs } from '../utils/yt-dlp.util';

const execFileAsync = promisify(execFile);

export class YouTubeService {
  /**
   * Validate YouTube URL format
   */
  static validateUrl(url: string): boolean {
    const patterns = [
      /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtu\.be\/[\w-]+/
    ];

    return patterns.some(pattern => pattern.test(url));
  }

  /**
   * Extract video ID from YouTube URL
   */
  static extractVideoId(url: string): string | null {
    // Standard YouTube URL
    const standardMatch = url.match(/[?&]v=([^&]+)/);
    if (standardMatch) {
      return standardMatch[1];
    }

    // Short YouTube URL
    const shortMatch = url.match(/youtu\.be\/([^?]+)/);
    if (shortMatch) {
      return shortMatch[1];
    }

    return null;
  }

  /**
   * Get video metadata using yt-dlp
   */
  static async getMetadata(url: string): Promise<VideoMetadata> {
    try {
      Logger.info(`Fetching metadata for: ${url}`);

      const { command, args: baseArgs } = getYtDlpCommand();
      const args = [...baseArgs, ...getYtDlpMetadataArgs(url)];

      const { stdout, stderr } = await execFileAsync(command, args, {
        timeout: 30000 // 30 second timeout
      });

      if (stderr) {
        Logger.warn('yt-dlp stderr:', stderr);
      }

      // Parse JSON output
      const metadata = JSON.parse(stdout);

      // Extract relevant information
      const result: VideoMetadata = {
        title: metadata.title || 'Unknown Title',
        duration: metadata.duration || 0,
        thumbnail: metadata.thumbnail || '',
        url: url
      };

      Logger.info(`Metadata fetched successfully: ${result.title}`);
      return result;

    } catch (error: any) {
      Logger.error('Error fetching metadata', error);

      // Check for specific error messages
      if (error.message?.includes('Video unavailable')) {
        const err = new Error('Video is unavailable, private, or restricted');
        (err as any).code = ErrorCode.VIDEO_UNAVAILABLE;
        throw err;
      }

      if (error.message?.includes('timeout')) {
        const err = new Error('Request timed out while fetching video metadata');
        (err as any).code = ErrorCode.EXTRACTION_FAILED;
        throw err;
      }

      const err = new Error('Failed to fetch video metadata');
      (err as any).code = ErrorCode.EXTRACTION_FAILED;
      throw err;
    }
  }
}
