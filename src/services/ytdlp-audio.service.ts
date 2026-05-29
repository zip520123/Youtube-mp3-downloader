import { spawn } from 'child_process';
import * as fs from 'fs';
import { Logger } from '../utils/logger.util';
import { progressTracker } from '../utils/progress.util';

export class YtDlpAudioService {
  /**
   * Download and convert audio using yt-dlp
   */
  static async downloadAudio(url: string, outputPath: string, fileId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        Logger.info(`Starting yt-dlp audio download for: ${url}`);

        // Use spawn to capture real-time output for progress
        // Use flags consistent with YouTubeService for reliability:
        // - Use cookies from browser (Chrome preferred)
        // - Use Node.js as JS runtime for signature solving
        // - Enable remote components for challenge solvers
        const args = [
          '-m', 'yt_dlp',
          '-x',
          '--audio-format', 'mp3',
          '--audio-quality', '192K',
          '--cookies-from-browser', 'chrome',
          '--js-runtimes', 'node',
          '--remote-components', 'ejs:github',
          '--newline', // Output progress on new lines
          '--progress', // Show progress
          '-o', outputPath,
          url
        ];

        const ytdlp = spawn('python3', args);

        let lastProgress = 30;

        // Capture stdout for progress
        ytdlp.stdout.on('data', (data) => {
          const output = data.toString();
          Logger.debug(`yt-dlp output: ${output}`);

          // Parse progress from yt-dlp output
          // Format: [download] 45.2% of 3.24MiB at 1.23MiB/s ETA 00:02
          const downloadMatch = output.match(/\[download\]\s+(\d+\.?\d*)%/);
          if (downloadMatch && fileId) {
            const percent = parseFloat(downloadMatch[1]);
            // Map download 0-100% to progress 30-80%
            const progress = Math.floor(30 + (percent * 0.5));
            if (progress > lastProgress) {
              lastProgress = progress;
              progressTracker.updateProgress(fileId, {
                stage: 'downloading',
                progress,
                message: `Downloading... ${percent.toFixed(1)}%`
              });
            }
          }

          // Detect conversion phase
          if (output.includes('[ffmpeg]') || output.includes('Deleting original file')) {
            if (fileId) {
              progressTracker.updateProgress(fileId, {
                stage: 'converting',
                progress: 85,
                message: 'Converting to MP3...'
              });
            }
          }
        });

        // Capture stderr for errors
        ytdlp.stderr.on('data', (data) => {
          const output = data.toString();
          Logger.debug(`yt-dlp stderr: ${output}`);
        });

        // Handle process completion
        ytdlp.on('close', (code) => {
          if (code === 0) {
            // Verify file was created
            if (!fs.existsSync(outputPath)) {
              reject(new Error('Output file was not created by yt-dlp'));
              return;
            }

            const stats = fs.statSync(outputPath);
            if (stats.size === 0) {
              reject(new Error('Output file is empty'));
              return;
            }

            Logger.info(`Audio downloaded successfully: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

            if (fileId) {
              progressTracker.updateProgress(fileId, {
                stage: 'converting',
                progress: 95,
                message: 'Finalizing...'
              });
            }

            resolve();
          } else {
            reject(new Error(`yt-dlp process exited with code ${code}`));
          }
        });

        // Handle process errors
        ytdlp.on('error', (error) => {
          Logger.error('yt-dlp process error', error);
          reject(error);
        });

      } catch (error: any) {
        Logger.error('yt-dlp download error', error);

        // Parse yt-dlp specific errors
        if (error.message?.includes('Video unavailable')) {
          reject(new Error('Video is unavailable, private, or restricted'));
          return;
        }

        if (error.message?.includes('timeout')) {
          reject(new Error('Download timed out - video may be too long'));
          return;
        }

        reject(new Error(`Failed to download audio: ${error.message}`));
      }
    });
  }
}
