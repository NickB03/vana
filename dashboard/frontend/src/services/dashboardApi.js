/**
 * Dashboard API Client for React WebUI
 * 
 * This module provides API client functions for accessing dashboard data
 * from the unified Flask backend API.
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
const DASHBOARD_API_URL = `${API_BASE_URL}/api/dashboard`;
const AUTH_API_URL = `${API_BASE_URL}/api/auth`;

class DashboardApiClient {
  constructor() {
    this.token = localStorage.getItem('auth_token');
    this.baseHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get authorization headers with current token
   */
  getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      ...this.baseHeaders,
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  /**
   * Make authenticated API request
   */
  async makeRequest(url, options = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
          throw new Error('Authentication required');
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  /**
   * Dashboard Overview
   */
  async getDashboardOverview() {
    return this.makeRequest(`${DASHBOARD_API_URL}/overview`);
  }

  /**
   * Agent Management
   */
  async getAgents() {
    return this.makeRequest(`${DASHBOARD_API_URL}/agents`);
  }

  async getAgentDetails(agentId) {
    return this.makeRequest(`${DASHBOARD_API_URL}/agents/${agentId}`);
  }

  /**
   * System Health
   */
  async getSystemHealth() {
    return this.makeRequest(`${DASHBOARD_API_URL}/system`);
  }

  async getSystemMetrics(timeRange = '1h') {
    return this.makeRequest(`${DASHBOARD_API_URL}/system/metrics?range=${timeRange}`);
  }

  /**
   * Memory Analytics
   */
  async getMemoryUsage() {
    return this.makeRequest(`${DASHBOARD_API_URL}/memory`);
  }

  async getMemoryHistory(timeRange = '24h') {
    return this.makeRequest(`${DASHBOARD_API_URL}/memory/history?range=${timeRange}`);
  }

  /**
   * Task Execution
   */
  async getTasks(limit = 50, status = null) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (status) params.append('status', status);
    return this.makeRequest(`${DASHBOARD_API_URL}/tasks?${params}`);
  }

  async getTaskDetails(taskId) {
    return this.makeRequest(`${DASHBOARD_API_URL}/tasks/${taskId}`);
  }

  /**
   * Real-time Data (WebSocket alternative using polling)
   */
  async startRealTimeUpdates(callback, interval = 5000) {
    const updateData = async () => {
      try {
        const [overview, agents, system, memory] = await Promise.all([
          this.getDashboardOverview(),
          this.getAgents(),
          this.getSystemHealth(),
          this.getMemoryUsage()
        ]);

        callback({
          overview,
          agents,
          system,
          memory,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Real-time update error:', error);
      }
    };

    // Initial update
    await updateData();

    // Set up polling
    const intervalId = setInterval(updateData, interval);

    // Return cleanup function
    return () => clearInterval(intervalId);
  }

  /**
   * Authentication Bridge
   */
  async generateToken(userData) {
    return this.makeRequest(`${AUTH_API_URL}/generate-token`, {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async validateToken(token = null) {
    const tokenToValidate = token || localStorage.getItem('auth_token');
    if (!tokenToValidate) return { valid: false };

    return this.makeRequest(`${AUTH_API_URL}/validate-token`, {
      method: 'POST',
      body: JSON.stringify({ token: tokenToValidate })
    });
  }

  async refreshToken() {
    const currentToken = localStorage.getItem('auth_token');
    if (!currentToken) throw new Error('No token to refresh');

    const response = await this.makeRequest(`${AUTH_API_URL}/refresh-token`, {
      method: 'POST',
      body: JSON.stringify({ token: currentToken })
    });

    if (response.success) {
      localStorage.setItem('auth_token', response.token);
    }

    return response;
  }

  async createStreamlitSession() {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('No authentication token');

    return this.makeRequest(`${AUTH_API_URL}/streamlit-session`, {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  }

  async logout() {
    const token = localStorage.getItem('auth_token');
    
    try {
      await this.makeRequest(`${AUTH_API_URL}/logout`, {
        method: 'POST',
        body: JSON.stringify({ token })
      });
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      localStorage.removeItem('auth_token');
    }
  }

  async getCurrentUser() {
    return this.makeRequest(`${AUTH_API_URL}/user-info`);
  }

  /**
   * Health Check
   */
  async checkHealth() {
    return this.makeRequest(`${DASHBOARD_API_URL}/health`);
  }
}

// Create singleton instance
const dashboardApi = new DashboardApiClient();

// Export individual functions for easier use
export const {
  getDashboardOverview,
  getAgents,
  getAgentDetails,
  getSystemHealth,
  getSystemMetrics,
  getMemoryUsage,
  getMemoryHistory,
  getTasks,
  getTaskDetails,
  startRealTimeUpdates,
  generateToken,
  validateToken,
  refreshToken,
  createStreamlitSession,
  logout,
  getCurrentUser,
  checkHealth
} = dashboardApi;

// Export the class for advanced usage
export default dashboardApi;

// Utility functions
export const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatPercentage = (value, decimals = 1) => {
  return `${parseFloat(value).toFixed(decimals)}%`;
};

export const formatDuration = (milliseconds) => {
  if (milliseconds < 1000) return `${milliseconds}ms`;
  if (milliseconds < 60000) return `${(milliseconds / 1000).toFixed(1)}s`;
  if (milliseconds < 3600000) return `${(milliseconds / 60000).toFixed(1)}m`;
  return `${(milliseconds / 3600000).toFixed(1)}h`;
};

export const formatTimestamp = (timestamp) => {
  return new Date(timestamp).toLocaleString();
};

export const getStatusColor = (status) => {
  const colors = {
    'active': '#4ade80',
    'healthy': '#4ade80',
    'operational': '#4ade80',
    'completed': '#4ade80',
    'warning': '#fbbf24',
    'degraded': '#fbbf24',
    'running': '#3b82f6',
    'pending': '#6b7280',
    'error': '#ef4444',
    'failed': '#ef4444',
    'critical': '#dc2626',
    'inactive': '#9ca3af',
    'unknown': '#9ca3af'
  };
  return colors[status?.toLowerCase()] || colors.unknown;
};

export const getStatusIcon = (status) => {
  const icons = {
    'active': '✅',
    'healthy': '✅',
    'operational': '✅',
    'completed': '✅',
    'warning': '⚠️',
    'degraded': '⚠️',
    'running': '🔄',
    'pending': '⏳',
    'error': '❌',
    'failed': '❌',
    'critical': '🚨',
    'inactive': '⭕',
    'unknown': '❓'
  };
  return icons[status?.toLowerCase()] || icons.unknown;
};
