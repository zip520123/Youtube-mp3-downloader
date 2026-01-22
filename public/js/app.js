/**
 * Main Application Controller
 * Orchestrates the application flow and user interactions
 */

const app = {
  /**
   * Initialize the application
   */
  init() {
    ui.init();
    this.attachEventListeners();
    this.checkServerHealth();
    console.log('YouTube MP3 Downloader initialized');
  },

  /**
   * Attach event listeners to UI elements
   */
  attachEventListeners() {
    // Form submission
    ui.elements.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // Error close button
    ui.elements.errorClose.addEventListener('click', () => {
      ui.hideError();
    });

    // Auto-hide error after 10 seconds
    let errorTimeout = null;
    const originalShowError = ui.showError.bind(ui);
    ui.showError = (message) => {
      originalShowError(message);
      if (errorTimeout) {
        clearTimeout(errorTimeout);
      }
      errorTimeout = setTimeout(() => {
        ui.hideError();
      }, 10000);
    };
  },

  /**
   * Check if server is healthy
   */
  async checkServerHealth() {
    try {
      const health = await api.checkHealth();
      if (health.success) {
        console.log('Server is healthy');
      } else {
        console.warn('Server health check failed');
      }
    } catch (error) {
      console.error('Server health check error:', error);
    }
  },

  /**
   * Handle form submission
   */
  async handleSubmit() {
    const url = ui.elements.urlInput.value.trim();

    // Client-side validation
    if (!this.validateUrl(url)) {
      ui.showError('Please enter a valid YouTube URL (e.g., https://www.youtube.com/watch?v=...)');
      return;
    }

    // Disable form and show loading
    ui.disableForm();
    ui.showLoading();
    ui.resetProgress();

    let progressEventSource = null;

    try {
      // Start extraction (this returns immediately with fileId)
      const extractPromise = api.extractAudio(url);

      // Wait for the result
      const result = await extractPromise;

      // Subscribe to progress updates
      progressEventSource = api.subscribeToProgress(result.fileId, (progressData) => {
        ui.updateProgress(progressData.progress || 0, progressData.message || 'Processing...');
      });

      // Show result when complete
      ui.showResult(result);

      // Setup download handler
      this.setupDownload(result.fileId, result.title);

      // Reset form
      ui.resetForm();

    } catch (error) {
      // Show error message
      const errorMessage = error.message || 'Failed to extract audio. Please try again';
      ui.showError(errorMessage);
    } finally {
      // Cleanup progress subscription
      if (progressEventSource) {
        progressEventSource.close();
      }
    }
  },

  /**
   * Validate YouTube URL format
   * @param {string} url - URL to validate
   * @returns {boolean} - True if valid YouTube URL
   */
  validateUrl(url) {
    if (!url) return false;

    const patterns = [
      /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtu\.be\/[\w-]+/
    ];

    return patterns.some(pattern => pattern.test(url));
  },

  /**
   * Setup download button click handler
   * @param {string} fileId - File ID to download
   * @param {string} title - Video title for filename
   */
  setupDownload(fileId, title) {
    ui.elements.downloadBtn.onclick = () => {
      const downloadUrl = api.getDownloadUrl(fileId);

      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${this.sanitizeFilename(title)}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(`Download initiated for: ${title}`);
    };
  },

  /**
   * Sanitize filename by removing invalid characters
   * @param {string} filename - Original filename
   * @returns {string} - Sanitized filename
   */
  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-z0-9\s-]/gi, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  }
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    app.init();
  });
} else {
  app.init();
}
