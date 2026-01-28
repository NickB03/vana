/**
 * File Upload Validation Utility
 * Provides multi-layer security validation for user file uploads
 */

export interface FileCategory {
  name: string;
  extensions: string[];
  mimeTypes: string[];
  maxSizeBytes: number;
  magicBytes?: { offset: number; bytes: number[] }[];
}

// Maximum file size: 25MB (for audio files)
const MAX_FILE_SIZE = 25 * 1024 * 1024;

// Allowed file categories with specific constraints
export const ALLOWED_FILE_CATEGORIES: FileCategory[] = [
  {
    name: 'Documents',
    extensions: ['.pdf', '.docx', '.txt', '.md'],
    mimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    magicBytes: [
      { offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }, // PDF
      { offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04] }, // DOCX (ZIP-based)
    ]
  },
  {
    name: 'Images',
    extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'],
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml'
    ],
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    magicBytes: [
      { offset: 0, bytes: [0xFF, 0xD8, 0xFF] }, // JPEG
      { offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47] }, // PNG
      { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF
      { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // WEBP (RIFF)
    ]
  },
  {
    name: 'Data Files',
    extensions: ['.csv', '.json', '.xlsx'],
    mimeTypes: [
      'text/csv',
      'application/json',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    maxSizeBytes: 20 * 1024 * 1024, // 20MB
  },
  {
    name: 'Code',
    extensions: ['.js', '.ts', '.tsx', '.jsx', '.py', '.html', '.css'],
    mimeTypes: [
      'text/javascript',
      'application/javascript',
      'text/typescript',
      'text/x-python',
      'text/html',
      'text/css',
      'text/plain'
    ],
    maxSizeBytes: 2 * 1024 * 1024, // 2MB
  },
  {
    name: 'Audio',
    extensions: ['.mp3', '.wav', '.m4a', '.ogg'],
    mimeTypes: [
      'audio/mpeg',
      'audio/wav',
      'audio/x-wav',
      'audio/mp4',
      'audio/ogg'
    ],
    maxSizeBytes: 25 * 1024 * 1024, // 25MB
    magicBytes: [
      { offset: 0, bytes: [0x49, 0x44, 0x33] }, // MP3 (ID3)
      { offset: 0, bytes: [0xFF, 0xFB] }, // MP3 (MPEG)
      { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // WAV (RIFF)
    ]
  }
];

// Explicitly blocked extensions (executables, archives, scripts, system files)
const BLOCKED_EXTENSIONS = [
  // Executables
  '.exe', '.dll', '.bat', '.cmd', '.com', '.msi', '.scr', '.vbs',
  // Archives (potential for nested malware)
  '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2',
  // Scripts
  '.sh', '.bash', '.ps1', '.psm1',
  // System files
  '.sys', '.ini', '.reg',
  // Other risky formats
  '.apk', '.app', '.deb', '.dmg', '.pkg', '.iso'
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
  category?: FileCategory;
}

/**
 * Validate file extension against whitelist
 */
function validateFileExtension(filename: string): ValidationResult {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.')).trim();
  
  // Check if extension is blocked
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `File type ${ext} is not allowed for security reasons`
    };
  }

  // Check if extension is in allowed categories
  const category = ALLOWED_FILE_CATEGORIES.find(cat =>
    cat.extensions.includes(ext)
  );

  if (!category) {
    const allowedExts = ALLOWED_FILE_CATEGORIES
      .flatMap(c => c.extensions)
      .join(', ');
    return {
      valid: false,
      error: `File type ${ext} is not supported. Allowed types: ${allowedExts}`
    };
  }

  return { valid: true, category };
}

/**
 * Validate MIME type matches expected category
 */
function validateMimeType(file: File, category: FileCategory): ValidationResult {
  if (!category.mimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File MIME type ${file.type} doesn't match expected type for ${category.name}`
    };
  }

  return { valid: true };
}

/**
 * Validate file size against category limit
 */
function validateFileSize(file: File, category: FileCategory): ValidationResult {
  if (file.size > category.maxSizeBytes) {
    const maxSizeMB = Math.round(category.maxSizeBytes / (1024 * 1024));
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit for ${category.name}`
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of 25MB`
    };
  }

  return { valid: true };
}

/**
 * Validate file header (magic bytes) to prevent file type spoofing
 */
async function validateFileHeader(file: File, category: FileCategory): Promise<ValidationResult> {
  if (!category.magicBytes || category.magicBytes.length === 0) {
    return { valid: true }; // Skip if no magic bytes defined
  }

  try {
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const matchesAnyPattern = category.magicBytes.some(pattern => {
      return pattern.bytes.every((byte, index) => 
        bytes[pattern.offset + index] === byte
      );
    });

    if (!matchesAnyPattern) {
      return {
        valid: false,
        error: `File header doesn't match expected format for ${category.name}. File may be corrupted or spoofed.`
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: 'Failed to read file header'
    };
  }
}

/**
 * Sanitize filename to prevent path traversal attacks
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars
    .replace(/\\.{2,}/g, '_') // Prevent directory traversal
    .replace(/^\\.+/, '') // Remove leading dots
    .substring(0, 255); // Limit length
}

/**
 * Main validation function - orchestrates all validation checks
 */
export async function validateFile(file: File): Promise<ValidationResult> {
  // 1. Validate extension
  const extResult = validateFileExtension(file.name);
  if (!extResult.valid || !extResult.category) {
    return extResult;
  }

  const category = extResult.category;

  // 2. Validate MIME type
  const mimeResult = validateMimeType(file, category);
  if (!mimeResult.valid) {
    return mimeResult;
  }

  // 3. Validate file size
  const sizeResult = validateFileSize(file, category);
  if (!sizeResult.valid) {
    return sizeResult;
  }

  // 4. Validate file header (magic bytes)
  const headerResult = await validateFileHeader(file, category);
  if (!headerResult.valid) {
    return headerResult;
  }

  return { valid: true, category };
}

/**
 * Get human-readable allowed file types list
 */
export function getAllowedFileTypesDescription(): string {
  return ALLOWED_FILE_CATEGORIES
    .map(cat => `${cat.name} (${cat.extensions.join(', ')})`)
    .join('; ');
}
