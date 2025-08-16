#!/usr/bin/env node

/**
 * File Backup Manager for Claude Code Hook Integration
 * 
 * Provides versioned, incremental backup functionality that integrates 
 * seamlessly with the existing ClaudeCodeFileHooks system.
 * 
 * Features:
 * - Incremental backups with compression
 * - Metadata tracking (timestamp, operation type, file hash)
 * - Retention policies with automatic cleanup
 * - Fast restore functionality
 * - Backup integrity validation
 * - Performance optimized for hook integration
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { promisify } = require('util');
const { exec } = require('child_process');

const execAsync = promisify(exec);
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

class FileBackupManager {
  constructor(options = {}) {
    this.options = {
      backupDir: options.backupDir || path.join(process.cwd(), '.claude_workspace/backups'),
      enableCompression: options.enableCompression !== false,
      enableIncrementalBackup: options.enableIncrementalBackup !== false,
      maxBackupsPerFile: options.maxBackupsPerFile || 10,
      retentionDays: options.retentionDays || 30,
      minBackupInterval: options.minBackupInterval || 1000, // 1 second minimum between backups
      enableIntegrityCheck: options.enableIntegrityCheck !== false,
      enablePerformanceMode: options.enablePerformanceMode !== false,
      logLevel: options.logLevel || 'info',
      ...options
    };

    this.backupIndex = new Map(); // In-memory index for fast lookups
    this.pendingBackups = new Map(); // Queue for batch operations
    this.isInitialized = false;
    this.stats = {
      totalBackups: 0,
      totalSize: 0,
      compressionRatio: 0,
      averageBackupTime: 0
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    console.log('🗃️  Initializing File Backup Manager...');
    
    // Create backup directory structure
    await this.ensureBackupDirectories();
    
    // Load existing backup index
    await this.loadBackupIndex();
    
    // Clean up old backups based on retention policy
    await this.cleanupOldBackups();
    
    this.isInitialized = true;
    console.log(`✅ Backup system ready (${this.backupIndex.size} files indexed)`);
  }

  async ensureBackupDirectories() {
    const directories = [
      this.options.backupDir,
      path.join(this.options.backupDir, 'files'),
      path.join(this.options.backupDir, 'metadata'),
      path.join(this.options.backupDir, 'index'),
      path.join(this.options.backupDir, 'temp')
    ];

    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  // ============================================================================
  // BACKUP OPERATIONS (Pre-Hook Integration)
  // ============================================================================

  /**
   * Create backup before file modification (pre-write/pre-edit hook)
   */
  async createPreModificationBackup(filePath, context = {}) {
    const startTime = Date.now();
    
    try {
      // Check if file exists to backup
      let fileExists = false;
      let currentContent = '';
      let currentHash = '';
      
      try {
        currentContent = await fs.readFile(filePath, 'utf8');
        currentHash = this.calculateHash(currentContent);
        fileExists = true;
      } catch (error) {
        // File doesn't exist yet, which is okay for new files
        if (this.options.logLevel === 'debug') {
          console.log(`📁 No existing file to backup: ${filePath}`);
        }
        return { created: false, reason: 'file_not_exists' };
      }

      // Check if we need to create a backup (avoid duplicates)
      if (await this.shouldSkipBackup(filePath, currentHash, context)) {
        return { created: false, reason: 'duplicate_or_recent' };
      }

      // Create backup metadata
      const backupMetadata = {
        originalPath: filePath,
        backupId: this.generateBackupId(filePath),
        timestamp: new Date().toISOString(),
        operation: context.operation || 'unknown',
        hookType: context.hookType || 'pre-modification',
        fileHash: currentHash,
        fileSize: currentContent.length,
        contentType: this.detectContentType(filePath),
        compressed: this.options.enableCompression,
        created: startTime
      };

      // Store the backup
      const backupResult = await this.storeBackup(
        currentContent, 
        backupMetadata, 
        context
      );

      // Update index
      await this.updateBackupIndex(filePath, backupMetadata);

      const duration = Date.now() - startTime;
      this.updateStats(backupResult, duration);

      if (this.options.logLevel === 'debug') {
        console.log(`💾 Backup created: ${filePath} → ${backupMetadata.backupId} (${duration}ms)`);
      }

      return {
        created: true,
        backupId: backupMetadata.backupId,
        metadata: backupMetadata,
        performance: {
          duration,
          originalSize: currentContent.length,
          backupSize: backupResult.size,
          compressionRatio: backupResult.compressionRatio
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to create backup for ${filePath}:`, error.message);
      
      return {
        created: false,
        error: error.message,
        duration
      };
    }
  }

  /**
   * Validate backup after successful file operation (post-write/post-edit hook)
   */
  async validatePostModificationBackup(filePath, backupId, context = {}) {
    if (!backupId) {
      return { validated: true, reason: 'no_backup_created' };
    }

    try {
      // Verify backup integrity
      const integrityCheck = await this.validateBackupIntegrity(backupId);
      
      if (!integrityCheck.valid) {
        console.warn(`⚠️  Backup integrity check failed for ${backupId}`);
        return { validated: false, reason: 'integrity_check_failed', details: integrityCheck };
      }

      // Update backup metadata with post-operation info
      await this.updateBackupMetadata(backupId, {
        validated: true,
        postOperationTimestamp: new Date().toISOString(),
        postOperationContext: context
      });

      if (this.options.logLevel === 'debug') {
        console.log(`✅ Backup validated: ${backupId}`);
      }

      return { validated: true, backupId, integrityCheck };

    } catch (error) {
      console.error(`❌ Failed to validate backup ${backupId}:`, error.message);
      return { validated: false, error: error.message };
    }
  }

  // ============================================================================
  // BACKUP STORAGE AND RETRIEVAL
  // ============================================================================

  async storeBackup(content, metadata, context = {}) {
    const backupPath = this.getBackupFilePath(metadata.backupId);
    const metadataPath = this.getMetadataFilePath(metadata.backupId);
    
    let finalContent = content;
    let compressionRatio = 1;

    // Apply compression if enabled
    if (this.options.enableCompression && content.length > 100) {
      const compressed = await gzip(Buffer.from(content, 'utf8'));
      finalContent = compressed;
      compressionRatio = content.length / compressed.length;
      metadata.compressed = true;
      metadata.originalSize = content.length;
      metadata.compressedSize = compressed.length;
    }

    // Write backup file
    await fs.writeFile(backupPath, finalContent);
    
    // Write metadata
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    return {
      path: backupPath,
      size: finalContent.length,
      compressionRatio,
      metadata
    };
  }

  async retrieveBackup(backupId) {
    try {
      const backupPath = this.getBackupFilePath(backupId);
      const metadataPath = this.getMetadataFilePath(backupId);

      // Read metadata
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);

      // Read backup content
      let backupContent = await fs.readFile(backupPath);

      // Decompress if needed
      if (metadata.compressed) {
        backupContent = await gunzip(backupContent);
      }

      return {
        content: backupContent.toString('utf8'),
        metadata,
        retrieved: true
      };

    } catch (error) {
      throw new Error(`Failed to retrieve backup ${backupId}: ${error.message}`);
    }
  }

  // ============================================================================
  // BACKUP DISCOVERY AND MANAGEMENT
  // ============================================================================

  async listBackupsForFile(filePath, options = {}) {
    const limit = options.limit || 10;
    const sortBy = options.sortBy || 'timestamp';
    const ascending = options.ascending || false;

    // Get backups from index
    const fileBackups = this.backupIndex.get(filePath) || [];
    
    // Sort backups
    const sortedBackups = fileBackups.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'timestamp':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'size':
          comparison = a.fileSize - b.fileSize;
          break;
        case 'operation':
          comparison = a.operation.localeCompare(b.operation);
          break;
        default:
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      
      return ascending ? comparison : -comparison;
    });

    return sortedBackups.slice(0, limit);
  }

  async findBackupByOperation(filePath, operation, maxAge = 3600000) { // 1 hour default
    const backups = await this.listBackupsForFile(filePath, { limit: 50 });
    const cutoffTime = Date.now() - maxAge;

    return backups.find(backup => 
      backup.operation === operation && 
      new Date(backup.timestamp).getTime() > cutoffTime
    );
  }

  async searchBackups(query = {}) {
    const results = [];
    
    for (const [filePath, backups] of this.backupIndex.entries()) {
      for (const backup of backups) {
        let matches = true;

        // Filter by file path pattern
        if (query.filePattern && !filePath.includes(query.filePattern)) {
          matches = false;
        }

        // Filter by operation
        if (query.operation && backup.operation !== query.operation) {
          matches = false;
        }

        // Filter by time range
        if (query.since) {
          const backupTime = new Date(backup.timestamp).getTime();
          const sinceTime = new Date(query.since).getTime();
          if (backupTime < sinceTime) {
            matches = false;
          }
        }

        // Filter by content type
        if (query.contentType && backup.contentType !== query.contentType) {
          matches = false;
        }

        if (matches) {
          results.push({ filePath, ...backup });
        }
      }
    }

    // Sort results by timestamp (newest first)
    return results.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  // ============================================================================
  // RESTORE FUNCTIONALITY
  // ============================================================================

  async restoreFile(filePath, backupId, options = {}) {
    const dryRun = options.dryRun || false;
    const createBackupBeforeRestore = options.createBackupBeforeRestore !== false;

    try {
      // Get backup content
      const backupData = await this.retrieveBackup(backupId);
      
      if (dryRun) {
        return {
          success: true,
          dryRun: true,
          backupData: {
            size: backupData.content.length,
            timestamp: backupData.metadata.timestamp,
            operation: backupData.metadata.operation
          }
        };
      }

      // Create backup of current file before restore (if it exists)
      let preRestoreBackupId = null;
      if (createBackupBeforeRestore) {
        try {
          const preRestoreBackup = await this.createPreModificationBackup(filePath, {
            operation: 'pre-restore',
            hookType: 'restore-safety'
          });
          preRestoreBackupId = preRestoreBackup.backupId;
        } catch (error) {
          // Non-critical error if file doesn't exist
          if (this.options.logLevel === 'debug') {
            console.log(`No current file to backup before restore: ${filePath}`);
          }
        }
      }

      // Ensure target directory exists
      const targetDir = path.dirname(filePath);
      await fs.mkdir(targetDir, { recursive: true });

      // Restore the file
      await fs.writeFile(filePath, backupData.content, 'utf8');

      // Log the restore operation
      const restoreEntry = {
        timestamp: new Date().toISOString(),
        operation: 'restore',
        restoredFromBackup: backupId,
        targetFile: filePath,
        preRestoreBackup: preRestoreBackupId
      };

      if (this.options.logLevel !== 'silent') {
        console.log(`🔄 File restored: ${filePath} ← backup ${backupId}`);
      }

      return {
        success: true,
        restoredFile: filePath,
        restoredFromBackup: backupId,
        preRestoreBackup: preRestoreBackupId,
        restoreEntry
      };

    } catch (error) {
      throw new Error(`Failed to restore ${filePath} from backup ${backupId}: ${error.message}`);
    }
  }

  async restoreFileToVersion(filePath, versionNumber, options = {}) {
    // Get list of backups for the file
    const backups = await this.listBackupsForFile(filePath, { 
      sortBy: 'timestamp', 
      ascending: false,
      limit: versionNumber + 5 // Get a few extra to handle gaps
    });

    if (versionNumber < 1 || versionNumber > backups.length) {
      throw new Error(`Invalid version number ${versionNumber}. File has ${backups.length} backup versions.`);
    }

    const targetBackup = backups[versionNumber - 1]; // Convert to 0-based index
    return await this.restoreFile(filePath, targetBackup.backupId, options);
  }

  // ============================================================================
  // BACKUP CLEANUP AND RETENTION
  // ============================================================================

  async cleanupOldBackups() {
    const cutoffTime = Date.now() - (this.options.retentionDays * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;
    let cleanedSize = 0;

    for (const [filePath, backups] of this.backupIndex.entries()) {
      // Sort backups by timestamp (newest first)
      const sortedBackups = backups.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Keep the most recent N backups, regardless of age
      const toKeep = sortedBackups.slice(0, this.options.maxBackupsPerFile);
      const candidates = sortedBackups.slice(this.options.maxBackupsPerFile);

      // Remove old backups beyond retention period
      for (const backup of candidates) {
        const backupTime = new Date(backup.timestamp).getTime();
        
        if (backupTime < cutoffTime) {
          try {
            await this.deleteBackup(backup.backupId);
            cleanedCount++;
            cleanedSize += backup.fileSize || 0;
          } catch (error) {
            console.warn(`⚠️  Failed to delete old backup ${backup.backupId}:`, error.message);
          }
        }
      }

      // Update index with remaining backups
      this.backupIndex.set(filePath, toKeep);
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old backups (${this.formatSize(cleanedSize)} freed)`);
    }

    return { cleanedCount, cleanedSize };
  }

  async deleteBackup(backupId) {
    try {
      const backupPath = this.getBackupFilePath(backupId);
      const metadataPath = this.getMetadataFilePath(backupId);

      await fs.unlink(backupPath);
      await fs.unlink(metadataPath);

      // Remove from index
      for (const [filePath, backups] of this.backupIndex.entries()) {
        const updatedBackups = backups.filter(b => b.backupId !== backupId);
        if (updatedBackups.length !== backups.length) {
          this.backupIndex.set(filePath, updatedBackups);
          break;
        }
      }

    } catch (error) {
      throw new Error(`Failed to delete backup ${backupId}: ${error.message}`);
    }
  }

  // ============================================================================
  // BACKUP INTEGRITY AND VALIDATION
  // ============================================================================

  async validateBackupIntegrity(backupId) {
    try {
      const backupData = await this.retrieveBackup(backupId);
      const computedHash = this.calculateHash(backupData.content);
      
      const isValid = computedHash === backupData.metadata.fileHash;
      
      return {
        valid: isValid,
        backupId,
        expectedHash: backupData.metadata.fileHash,
        computedHash,
        size: backupData.content.length,
        timestamp: backupData.metadata.timestamp
      };

    } catch (error) {
      return {
        valid: false,
        backupId,
        error: error.message
      };
    }
  }

  async validateAllBackups() {
    const results = {
      total: 0,
      valid: 0,
      invalid: 0,
      errors: []
    };

    for (const [filePath, backups] of this.backupIndex.entries()) {
      for (const backup of backups) {
        results.total++;
        
        const validation = await this.validateBackupIntegrity(backup.backupId);
        
        if (validation.valid) {
          results.valid++;
        } else {
          results.invalid++;
          results.errors.push({
            filePath,
            backupId: backup.backupId,
            error: validation.error || 'Hash mismatch'
          });
        }
      }
    }

    return results;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  generateBackupId(filePath) {
    const timestamp = Date.now();
    const hash = crypto.createHash('md5').update(filePath + timestamp).digest('hex').slice(0, 8);
    return `${timestamp}-${hash}`;
  }

  calculateHash(content) {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  detectContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const typeMap = {
      '.js': 'javascript',
      '.jsx': 'react',
      '.ts': 'typescript',
      '.tsx': 'react-typescript',
      '.py': 'python',
      '.md': 'markdown',
      '.json': 'json',
      '.css': 'css',
      '.scss': 'scss',
      '.html': 'html',
      '.yml': 'yaml',
      '.yaml': 'yaml'
    };
    return typeMap[ext] || 'text';
  }

  getBackupFilePath(backupId) {
    return path.join(this.options.backupDir, 'files', `${backupId}.backup`);
  }

  getMetadataFilePath(backupId) {
    return path.join(this.options.backupDir, 'metadata', `${backupId}.meta.json`);
  }

  async shouldSkipBackup(filePath, currentHash, context) {
    // Check for recent duplicate backups
    const recentBackups = await this.listBackupsForFile(filePath, { limit: 3 });
    
    for (const backup of recentBackups) {
      // Skip if same content hash
      if (backup.fileHash === currentHash) {
        return true;
      }
      
      // Skip if very recent backup (within minBackupInterval)
      const backupTime = new Date(backup.timestamp).getTime();
      const timeDiff = Date.now() - backupTime;
      
      if (timeDiff < this.options.minBackupInterval) {
        return true;
      }
    }

    return false;
  }

  async loadBackupIndex() {
    try {
      const indexPath = path.join(this.options.backupDir, 'index', 'backup-index.json');
      const indexContent = await fs.readFile(indexPath, 'utf8');
      const indexData = JSON.parse(indexContent);
      
      // Convert back to Map
      for (const [filePath, backups] of Object.entries(indexData)) {
        this.backupIndex.set(filePath, backups);
      }
      
      if (this.options.logLevel === 'debug') {
        console.log(`📇 Loaded backup index with ${this.backupIndex.size} files`);
      }

    } catch (error) {
      // Index doesn't exist yet, will be created
      if (this.options.logLevel === 'debug') {
        console.log('📇 Creating new backup index');
      }
    }
  }

  async saveBackupIndex() {
    try {
      const indexPath = path.join(this.options.backupDir, 'index', 'backup-index.json');
      
      // Convert Map to object for JSON serialization
      const indexData = Object.fromEntries(this.backupIndex);
      
      await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2));
      
    } catch (error) {
      console.warn('⚠️  Failed to save backup index:', error.message);
    }
  }

  async updateBackupIndex(filePath, metadata) {
    if (!this.backupIndex.has(filePath)) {
      this.backupIndex.set(filePath, []);
    }
    
    const fileBackups = this.backupIndex.get(filePath);
    fileBackups.push(metadata);
    
    // Keep only the most recent backups per file
    if (fileBackups.length > this.options.maxBackupsPerFile) {
      // Sort by timestamp and keep the newest
      fileBackups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      fileBackups.splice(this.options.maxBackupsPerFile);
    }
    
    // Save index periodically (not on every operation for performance)
    if (Math.random() < 0.1) { // 10% chance to save
      await this.saveBackupIndex();
    }
  }

  async updateBackupMetadata(backupId, updates) {
    try {
      const metadataPath = this.getMetadataFilePath(backupId);
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);
      
      Object.assign(metadata, updates);
      
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      
    } catch (error) {
      console.warn(`⚠️  Failed to update backup metadata for ${backupId}:`, error.message);
    }
  }

  updateStats(backupResult, duration) {
    this.stats.totalBackups++;
    this.stats.totalSize += backupResult.size;
    
    if (backupResult.compressionRatio) {
      this.stats.compressionRatio = (
        (this.stats.compressionRatio * (this.stats.totalBackups - 1) + backupResult.compressionRatio) 
        / this.stats.totalBackups
      );
    }
    
    this.stats.averageBackupTime = (
      (this.stats.averageBackupTime * (this.stats.totalBackups - 1) + duration) 
      / this.stats.totalBackups
    );
  }

  formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  // ============================================================================
  // STATUS AND REPORTING
  // ============================================================================

  getBackupStats() {
    const totalFiles = this.backupIndex.size;
    const totalBackups = Array.from(this.backupIndex.values()).reduce(
      (sum, backups) => sum + backups.length, 0
    );

    return {
      initialized: this.isInitialized,
      totalFiles,
      totalBackups,
      totalSize: this.formatSize(this.stats.totalSize),
      averageCompressionRatio: this.stats.compressionRatio.toFixed(2),
      averageBackupTime: `${this.stats.averageBackupTime.toFixed(0)}ms`,
      configuration: {
        backupDir: this.options.backupDir,
        compressionEnabled: this.options.enableCompression,
        incrementalEnabled: this.options.enableIncrementalBackup,
        maxBackupsPerFile: this.options.maxBackupsPerFile,
        retentionDays: this.options.retentionDays
      }
    };
  }

  async generateBackupReport() {
    const stats = this.getBackupStats();
    const validation = await this.validateAllBackups();
    
    return {
      generated: new Date().toISOString(),
      statistics: stats,
      validation,
      recentBackups: await this.searchBackups({ since: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }),
      topFiles: this.getTopBackedUpFiles(10)
    };
  }

  getTopBackedUpFiles(limit = 10) {
    const fileCounts = Array.from(this.backupIndex.entries())
      .map(([filePath, backups]) => ({
        filePath,
        backupCount: backups.length,
        totalSize: backups.reduce((sum, b) => sum + (b.fileSize || 0), 0),
        lastBackup: backups.reduce((latest, b) => 
          new Date(b.timestamp) > new Date(latest.timestamp) ? b : latest
        ).timestamp
      }))
      .sort((a, b) => b.backupCount - a.backupCount);

    return fileCounts.slice(0, limit);
  }

  async shutdown() {
    console.log('🗃️  Shutting down File Backup Manager...');
    
    // Save final backup index
    await this.saveBackupIndex();
    
    console.log('✅ Backup manager shutdown complete');
  }
}

module.exports = { FileBackupManager };

// CLI usage
if (require.main === module) {
  const manager = new FileBackupManager({ logLevel: 'debug' });
  
  async function testBackupManager() {
    console.log('🧪 Testing File Backup Manager');
    console.log('=============================');
    
    try {
      await manager.initialize();
      
      // Test backup creation
      console.log('\n1️⃣  Testing Backup Creation...');
      const testContent = 'import React from "react";\nexport default function Test() { return <div>Test</div>; }';
      const testFile = '/tmp/test-component.tsx';
      
      // Create test file
      await fs.writeFile(testFile, testContent, 'utf8');
      
      const backupResult = await manager.createPreModificationBackup(testFile, {
        operation: 'test-write',
        hookType: 'pre-write'
      });
      
      console.log('✅ Backup created:', backupResult.created);
      
      if (backupResult.created) {
        // Test backup validation
        console.log('\n2️⃣  Testing Backup Validation...');
        const validationResult = await manager.validatePostModificationBackup(
          testFile, 
          backupResult.backupId
        );
        console.log('✅ Backup validated:', validationResult.validated);
        
        // Test restore
        console.log('\n3️⃣  Testing File Restore...');
        const restoreResult = await manager.restoreFile(testFile, backupResult.backupId, { dryRun: true });
        console.log('✅ Restore test:', restoreResult.success);
        
        // Test backup listing
        console.log('\n4️⃣  Testing Backup Listing...');
        const backups = await manager.listBackupsForFile(testFile);
        console.log(`✅ Found ${backups.length} backups for file`);
      }
      
      // Show stats
      console.log('\n5️⃣  Backup Statistics:');
      const stats = manager.getBackupStats();
      console.log('📊 Stats:', JSON.stringify(stats, null, 2));
      
      // Clean up
      await manager.shutdown();
      await fs.unlink(testFile).catch(() => {}); // Clean up test file
      
      console.log('\n🎉 File Backup Manager Test Complete!');
      
    } catch (error) {
      console.error('❌ Backup manager test failed:', error.message);
      if (error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }
  
  testBackupManager();
}