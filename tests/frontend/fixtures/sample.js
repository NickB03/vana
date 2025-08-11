// Sample JavaScript file for testing code editor functionality

/**
 * Utility functions for the Vana application
 */

class MessageHandler {
  constructor(options = {}) {
    this.options = {
      timeout: 5000,
      retries: 3,
      ...options
    };
    this.messages = [];
  }

  /**
   * Process a message with validation
   * @param {string} content - The message content
   * @param {string} type - The message type
   * @returns {Promise<Object>} Processed message object
   */
  async processMessage(content, type = 'user') {
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid message content');
    }

    const message = {
      id: this.generateId(),
      content: content.trim(),
      type,
      timestamp: Date.now(),
      processed: false
    };

    try {
      await this.validateMessage(message);
      message.processed = true;
      this.messages.push(message);
      return message;
    } catch (error) {
      console.error('Message processing failed:', error);
      throw error;
    }
  }

  /**
   * Validate message content
   * @param {Object} message - Message to validate
   */
  async validateMessage(message) {
    // Simulate async validation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (message.content.length > 10000) {
      throw new Error('Message too long');
    }
    
    if (message.content.includes('<script>')) {
      throw new Error('Invalid content detected');
    }
    
    return true;
  }

  /**
   * Generate unique message ID
   * @returns {string} Unique identifier
   */
  generateId() {
    return 'msg_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  /**
   * Get messages by type
   * @param {string} type - Message type to filter by
   * @returns {Array} Filtered messages
   */
  getMessagesByType(type) {
    return this.messages.filter(msg => msg.type === type);
  }

  /**
   * Clear all messages
   */
  clearMessages() {
    this.messages = [];
  }

  /**
   * Export messages as JSON
   * @returns {string} JSON string of messages
   */
  exportMessages() {
    return JSON.stringify(this.messages, null, 2);
  }
}

// Utility functions
const utils = {
  /**
   * Format timestamp for display
   * @param {number} timestamp - Unix timestamp
   * @returns {string} Formatted date string
   */
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diff < 86400000) { // Less than 1 day
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  },

  /**
   * Debounce function execution
   * @param {Function} func - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Debounced function
   */
  debounce(func, delay) {
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  },

  /**
   * Deep clone an object
   * @param {Object} obj - Object to clone
   * @returns {Object} Cloned object
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    
    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item));
    }
    
    if (typeof obj === 'object') {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
  }
};

// Event system
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    
    // Return unsubscribe function
    return () => this.off(event, listener);
  }

  off(event, listenerToRemove) {
    if (!this.events[event]) return;
    
    this.events[event] = this.events[event].filter(
      listener => listener !== listenerToRemove
    );
  }

  emit(event, ...args) {
    if (!this.events[event]) return;
    
    this.events[event].forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  once(event, listener) {
    const onceListener = (...args) => {
      this.off(event, onceListener);
      listener(...args);
    };
    this.on(event, onceListener);
  }
}

// Export for CommonJS and ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MessageHandler, utils, EventEmitter };
}

// For testing in browser
if (typeof window !== 'undefined') {
  window.VanaUtils = { MessageHandler, utils, EventEmitter };
}