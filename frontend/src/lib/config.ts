// API Configuration using environment variables

export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8081',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:8081',
  environment: import.meta.env.VITE_ENVIRONMENT || 'development',
  isDevelopment: import.meta.env.VITE_ENVIRONMENT !== 'production',
} as const

// Helper function to build API endpoints
export function apiEndpoint(path: string): string {
  return `${config.apiUrl}${path.startsWith('/') ? path : `/${path}`}`
}

// Helper function to build WebSocket endpoints
export function wsEndpoint(path: string): string {
  return `${config.wsUrl}${path.startsWith('/') ? path : `/${path}`}`
}