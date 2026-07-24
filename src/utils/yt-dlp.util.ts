import { spawnSync } from 'child_process';

export type YtDlpClient = 'web' | 'android';

export interface YtDlpCommand {
  command: string;
  args: string[];
}

export function getYtDlpCommand(): YtDlpCommand {
  const check = spawnSync('yt-dlp', ['--version'], { encoding: 'utf8' });
  if (check.status === 0) {
    return { command: 'yt-dlp', args: [] };
  }

  return { command: 'python3', args: ['-m', 'yt_dlp'] };
}

export function getYtDlpAudioArgs(outputPath: string, url: string, client: YtDlpClient): string[] {
  return [
    '-x',
    '--audio-format', 'mp3',
    '--audio-quality', '192K',
    '--cookies-from-browser', 'chrome',
    '--js-runtimes', 'node',
    '--remote-components', 'ejs:github',
    '--extractor-args', `youtube:player_client=${client}`,
    '--newline',
    '--progress',
    '-o',
    outputPath,
    url
  ];
}

export function getYtDlpMetadataArgs(url: string): string[] {
  return [
    '--skip-download',
    '--print-json',
    '--cookies-from-browser', 'chrome',
    '--js-runtimes', 'node',
    '--remote-components', 'ejs:github',
    '--extractor-args', 'youtube:player_client=web',
    url
  ];
}
