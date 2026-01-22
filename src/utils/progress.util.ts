import { EventEmitter } from 'events';

interface ProgressData {
  fileId: string;
  stage: 'metadata' | 'downloading' | 'converting' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
  error?: string;
}

class ProgressTracker extends EventEmitter {
  private progressMap: Map<string, ProgressData> = new Map();

  /**
   * Update progress for a file
   */
  updateProgress(fileId: string, data: Partial<ProgressData>): void {
    const current = this.progressMap.get(fileId) || {
      fileId,
      stage: 'metadata',
      progress: 0,
      message: ''
    };

    const updated = { ...current, ...data, fileId };
    this.progressMap.set(fileId, updated);
    this.emit(`progress:${fileId}`, updated);
  }

  /**
   * Get progress for a file
   */
  getProgress(fileId: string): ProgressData | undefined {
    return this.progressMap.get(fileId);
  }

  /**
   * Clear progress for a file
   */
  clearProgress(fileId: string): void {
    this.progressMap.delete(fileId);
    this.emit(`complete:${fileId}`);
  }

  /**
   * Subscribe to progress updates for a file
   */
  onProgress(fileId: string, callback: (data: ProgressData) => void): () => void {
    this.on(`progress:${fileId}`, callback);

    // Return unsubscribe function
    return () => {
      this.off(`progress:${fileId}`, callback);
    };
  }

  /**
   * Subscribe to completion event
   */
  onComplete(fileId: string, callback: () => void): () => void {
    this.on(`complete:${fileId}`, callback);

    return () => {
      this.off(`complete:${fileId}`, callback);
    };
  }
}

export const progressTracker = new ProgressTracker();
