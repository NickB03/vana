// Environment and configuration constants
export const isProductionEnvironment = process.env.NODE_ENV === 'production';
export const isDevelopmentEnvironment = process.env.NODE_ENV === 'development';
export const isTestEnvironment = process.env.NODE_ENV === 'test';

// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Database Configuration
export const DATABASE_URL = process.env.DATABASE_URL;
export const POSTGRES_URL = process.env.POSTGRES_URL;

// Auth Configuration
export const NEXTAUTH_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
export const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

// AI/Chat Configuration
export const MAX_MESSAGES_PER_CHAT = 100;
export const MAX_CHAT_HISTORY = 50;
export const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';

// File and Upload Limits
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_TYPES = ['.txt', '.md', '.json', '.csv', '.pdf'];

// Rate Limiting
export const RATE_LIMIT_REQUESTS_PER_MINUTE = 60;
export const RATE_LIMIT_REQUESTS_PER_HOUR = 1000;

// Cache Configuration
export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAILY: 86400, // 24 hours
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_CHAT: true,
  ENABLE_FILE_UPLOAD: true,
  ENABLE_DOCUMENT_CREATION: true,
  ENABLE_SUGGESTIONS: true,
  ENABLE_WEATHER: false,
} as const;

// UI Constants
export const SIDEBAR_WIDTH = 250;
export const MOBILE_BREAKPOINT = 768;

// Error Messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'You must be logged in to perform this action',
  FORBIDDEN: 'You do not have permission to perform this action',
  NOT_FOUND: 'The requested resource was not found',
  INTERNAL_ERROR: 'An internal server error occurred',
  VALIDATION_ERROR: 'Please check your input and try again',
  RATE_LIMITED: 'Too many requests. Please try again later.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  CHAT_CREATED: 'Chat created successfully',
  MESSAGE_SENT: 'Message sent successfully',
  DOCUMENT_CREATED: 'Document created successfully',
  DOCUMENT_UPDATED: 'Document updated successfully',
  SETTINGS_UPDATED: 'Settings updated successfully',
} as const;