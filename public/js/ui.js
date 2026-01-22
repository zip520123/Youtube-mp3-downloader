/**
 * UI Controller for YouTube MP3 Downloader
 * Handles all DOM manipulation and UI state management
 */

const ui = {
  elements: {
    form: null,
    urlInput: null,
    submitBtn: null,
    loading: null,
    progressMessage: null,
    progressBar: null,
    progressPercent: null,
    error: null,
    errorMessage: null,
    errorClose: null,
    result: null,
    thumbnail: null,
    title: null,
    duration: null,
    downloadBtn: null
  },

  /**
   * Initialize UI by caching DOM elements
   */
  init() {
    this.elements.form = document.getElementById('download-form');
    this.elements.urlInput = document.getElementById('youtube-url');
    this.elements.submitBtn = document.getElementById('submit-btn');
    this.elements.loading = document.getElementById('loading');
    this.elements.progressMessage = document.getElementById('progress-message');
    this.elements.progressBar = document.getElementById('progress-bar');
    this.elements.progressPercent = document.getElementById('progress-percent');
    this.elements.error = document.getElementById('error');
    this.elements.errorMessage = document.getElementById('error-message');
    this.elements.errorClose = document.getElementById('error-close');
    this.elements.result = document.getElementById('result');
    this.elements.thumbnail = document.getElementById('thumbnail');
    this.elements.title = document.getElementById('title');
    this.elements.duration = document.getElementById('duration');
    this.elements.downloadBtn = document.getElementById('download-btn');
  },

  /**
   * Show loading spinner and hide other sections
   */
  showLoading() {
    this.elements.loading.classList.remove('hidden');
    this.elements.error.classList.add('hidden');
    this.elements.result.classList.add('hidden');
  },

  /**
   * Hide loading spinner
   */
  hideLoading() {
    this.elements.loading.classList.add('hidden');
  },

  /**
   * Show error message
   * @param {string} message - Error message to display
   */
  showError(message) {
    this.hideLoading();
    this.elements.result.classList.add('hidden');
    this.elements.errorMessage.textContent = message;
    this.elements.error.classList.remove('hidden');
    this.enableForm();
  },

  /**
   * Hide error message
   */
  hideError() {
    this.elements.error.classList.add('hidden');
  },

  /**
   * Show result section with video data
   * @param {Object} data - Result data from API
   * @param {string} data.fileId - File ID
   * @param {string} data.title - Video title
   * @param {number} data.duration - Video duration in seconds
   * @param {string} data.thumbnail - Thumbnail URL
   * @param {string} data.downloadUrl - Download URL
   */
  showResult(data) {
    this.hideLoading();
    this.hideError();

    // Populate result data
    this.elements.thumbnail.src = data.thumbnail;
    this.elements.thumbnail.alt = data.title;
    this.elements.title.textContent = data.title;
    this.elements.duration.textContent = `Duration: ${this.formatDuration(data.duration)}`;

    // Show result section
    this.elements.result.classList.remove('hidden');

    // Scroll to result
    this.elements.result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    this.enableForm();
  },

  /**
   * Hide result section
   */
  hideResult() {
    this.elements.result.classList.add('hidden');
  },

  /**
   * Format duration from seconds to MM:SS or HH:MM:SS
   * @param {number} seconds - Duration in seconds
   * @returns {string} - Formatted duration
   */
  formatDuration(seconds) {
    if (!seconds || seconds === 0) {
      return 'Unknown';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    return `${minutes}:${String(secs).padStart(2, '0')}`;
  },

  /**
   * Disable form submission
   */
  disableForm() {
    this.elements.submitBtn.disabled = true;
    this.elements.urlInput.disabled = true;
  },

  /**
   * Enable form submission
   */
  enableForm() {
    this.elements.submitBtn.disabled = false;
    this.elements.urlInput.disabled = false;
  },

  /**
   * Reset form to initial state
   */
  resetForm() {
    this.elements.urlInput.value = '';
  },

  /**
   * Update progress bar
   * @param {number} percent - Progress percentage (0-100)
   * @param {string} message - Progress message
   */
  updateProgress(percent, message) {
    if (this.elements.progressBar) {
      this.elements.progressBar.style.width = `${percent}%`;
    }
    if (this.elements.progressPercent) {
      this.elements.progressPercent.textContent = `${Math.round(percent)}%`;
    }
    if (this.elements.progressMessage && message) {
      this.elements.progressMessage.textContent = message;
    }
  },

  /**
   * Reset progress bar to initial state
   */
  resetProgress() {
    this.updateProgress(0, 'Processing video...');
  }
};
