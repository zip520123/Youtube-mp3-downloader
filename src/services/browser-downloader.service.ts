/// <reference lib="dom" />
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../utils/logger.util';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

const execAsync = promisify(exec);

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

export class BrowserDownloaderService {
  private static browser: Browser | null = null;

  /**
   * Get or create browser instance
   */
  private static async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.connected) {
      Logger.info('Launching headless browser...');
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
    }
    return this.browser;
  }

  /**
   * Get video metadata from browser
   */
  static async getMetadata(url: string): Promise<{ title: string; duration: number; thumbnail: string }> {
    let page: Page | null = null;

    try {
      const browser = await this.getBrowser();
      page = await browser.newPage();

      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      );

      Logger.info(`Navigating to: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await page.waitForSelector('video', { timeout: 30000 });

      const metadata = await page.evaluate(() => {
        const video = document.querySelector('video');
        const titleEl = document.querySelector('h1.ytd-video-primary-info-renderer, h1.title, yt-formatted-string.ytd-watch-metadata');
        const thumbnailEl = document.querySelector('meta[property="og:image"]');

        return {
          title: titleEl?.textContent?.trim() || 'Unknown Title',
          duration: video instanceof HTMLVideoElement ? video.duration : 0,
          thumbnail: (thumbnailEl as HTMLMetaElement)?.content || ''
        };
      });

      Logger.info(`Metadata fetched: ${metadata.title}`);
      return metadata;

    } catch (error: any) {
      Logger.error('Error fetching metadata from browser', error);
      throw new Error(`Failed to fetch metadata: ${error.message}`);
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Download file from URL using native http(s) module
   */
  private static downloadFromUrl(url: string, outputPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;

      const request = protocol.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': '*/*',
          'Referer': 'https://www.youtube.com/'
        }
      }, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        const fileStream = fs.createWriteStream(outputPath);
        let totalBytes = 0;

        response.on('data', (chunk) => {
          totalBytes += chunk.length;
        });

        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          resolve(totalBytes);
        });

        fileStream.on('error', (err) => {
          fs.unlinkSync(outputPath);
          reject(err);
        });
      });

      request.on('error', reject);
      request.setTimeout(120000, () => {
        request.destroy();
        reject(new Error('Download timeout'));
      });
    });
  }

  /**
   * Download audio using real browser - extract media URL from ytplayer
   */
  static async downloadAudio(url: string, outputPath: string): Promise<void> {
    let page: Page | null = null;

    try {
      const browser = await this.getBrowser();
      page = await browser.newPage();

      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      );

      Logger.info(`Navigating to: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await page.waitForSelector('video', { timeout: 30000 });

      Logger.info('Video player loaded, extracting media URL from player...');

      // Play the video briefly to ensure formats are loaded
      await page.evaluate(() => {
        const video = document.querySelector('video');
        if (video && video instanceof HTMLVideoElement) {
          video.muted = true;
          video.play();
        }
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Extract audio URL from ytplayer config
      const audioUrl = await page.evaluate(() => {
        try {
          // Try to access ytInitialPlayerResponse
          const scriptTags = Array.from(document.querySelectorAll('script'));
          for (const script of scriptTags) {
            const content = script.textContent || '';
            if (content.includes('ytInitialPlayerResponse')) {
              const match = content.match(/var ytInitialPlayerResponse = ({.+?});/);
              if (match) {
                const playerResponse = JSON.parse(match[1]);
                const formats = playerResponse?.streamingData?.adaptiveFormats || [];

                // Find audio-only format (usually itag 140 for m4a audio)
                const audioFormat = formats.find((f: any) =>
                  f.mimeType?.includes('audio') && !f.mimeType?.includes('video')
                ) || formats.find((f: any) => f.itag === 140);

                if (audioFormat?.url) {
                  return audioFormat.url;
                }
              }
            }
          }
        } catch (e) {
          console.error('Error extracting URL:', e);
        }
        return null;
      });

      if (!audioUrl) {
        throw new Error('Could not extract audio URL from YouTube player');
      }

      Logger.info(`Found audio URL: ${audioUrl.substring(0, 100)}...`);

      // Download the audio file
      const tempAudioPath = outputPath.replace('.mp3', '.temp.m4a');
      Logger.info('Downloading audio file...');

      const bytesDownloaded = await this.downloadFromUrl(audioUrl, tempAudioPath);
      Logger.info(`Downloaded ${(bytesDownloaded / 1024 / 1024).toFixed(2)} MB`);

      if (bytesDownloaded < 10000) {
        throw new Error('Downloaded file is too small or empty');
      }

      // Convert to MP3 using ffmpeg
      Logger.info('Converting to MP3...');
      const ffmpegCommand = `ffmpeg -i "${tempAudioPath}" -vn -ar 44100 -ac 2 -b:a 192k "${outputPath}" -y`;

      await execAsync(ffmpegCommand, { timeout: 120000 });

      // Clean up temp file
      if (fs.existsSync(tempAudioPath)) {
        fs.unlinkSync(tempAudioPath);
      }

      Logger.info('Conversion to MP3 completed');

      // Verify file was created and is not empty
      if (!fs.existsSync(outputPath)) {
        throw new Error('Output file was not created');
      }

      const stats = fs.statSync(outputPath);
      if (stats.size === 0) {
        throw new Error('Output file is empty');
      }

      Logger.info(`Audio file ready: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    } catch (error: any) {
      Logger.error('Browser download error', error);
      throw new Error(`Browser download failed: ${error.message}`);
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Close browser instance
   */
  static async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      Logger.info('Browser closed');
    }
  }
}
