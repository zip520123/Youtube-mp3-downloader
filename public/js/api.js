/**
 * API Client for YouTube MP3 Downloader
 * Handles all communication with the backend API
 */

const API_BASE = '/api';

const api = {
  /**
   * Extract audio from YouTube URL
   * @param {string} url - YouTube video URL
   * @returns {Promise<Object>} - Extraction result data
   * @throws {Error} - If extraction fails
   */
  async extractAudio(url) {
    try {
      const response = await fetch(`${API_BASE}/extract-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Extraction failed');
      }

      return data.data;
    } catch (error) {
      // Re-throw network errors with a more user-friendly message
      if (error.message === 'Failed to fetch') {
        throw new Error('Network error. Please check your connection and try again');
      }
      throw error;
    }
  },

  /**
   * Get download URL for a file
   * @param {string} fileId - Unique file identifier
   * @returns {string} - Download URL
   */
  getDownloadUrl(fileId) {
    return `${API_BASE}/download/${fileId}`;
  },

  /**
   * Check server health
   * @returns {Promise<Object>} - Health status
   */
  async checkHealth() {
    try {
      const response = await fetch(`${API_BASE}/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      return { success: false };
    }
  },

  /**
   * Subscribe to progress updates via Server-Sent Events
   * @param {string} fileId - File ID to track
   * @param {Function} onProgress - Callback for progress updates
   * @returns {EventSource} - EventSource instance for cleanup
   */
  subscribeToProgress(fileId, onProgress) {
    const eventSource = new EventSource(`${API_BASE}/progress/${fileId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.stage === 'done') {
          eventSource.close();
        } else if (!data.connected) {
          onProgress(data);
        }
      } catch (error) {
        console.error('Error parsing progress data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      eventSource.close();
    };

    return eventSource;
  }
};
