/**
 * Security Manager
 * 
 * Handles cryptographic validation, attack prevention, and security measures
 * for the Byzantine consensus system.
 */

const crypto = require('crypto');
const EventEmitter = require('events');

class SecurityManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.nodeId = options.nodeId;
    this.keySize = options.keySize || 2048;
    
    // Key management
    this.nodeKeys = new Map(); // nodeId -> {publicKey, verified}
    this.trustedCertificates = new Set();
    this.keyRotationInterval = options.keyRotationInterval || 86400000; // 24 hours
    
    // Message authentication
    this.messageNonces = new Map(); // Prevent replay attacks
    this.sequenceCounters = new Map(); // Per-node sequence tracking
    this.signatureCache = new Map(); // Cache validated signatures
    
    // Attack detection
    this.attackPatterns = new Map();
    this.suspiciousActivity = new Map();
    this.rateLimits = new Map();
    this.blacklist = new Set();
    
    // Zero-knowledge proof support
    this.zkProofCache = new Map();
    this.proofChallenges = new Map();
    
    // Threshold signature components
    this.thresholdScheme = {
      threshold: options.threshold || 2,
      shares: new Map(),
      publicShares: new Map()
    };
    
    this.initialize();
  }

  initialize() {
    console.log('🔐 Initializing Security Manager');
    
    // Generate node key pair
    this.generateNodeKeyPair();
    
    // Initialize cryptographic components
    this.initializeThresholdSchatures();
    this.initializeZKProofs();
    
    // Start security monitoring
    this.startSecurityMonitoring();
    
    this.emit('initialized', {
      nodeId: this.nodeId,
      keySize: this.keySize,
      thresholdEnabled: true,
      zkProofsEnabled: true
    });
  }

  // Key Management

  generateNodeKeyPair() {
    console.log(`🔑 Generating ${this.keySize}-bit RSA key pair for node ${this.nodeId}`);
    
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: this.keySize,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
    
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    
    // Store our public key in the registry
    this.nodeKeys.set(this.nodeId, {
      publicKey,
      verified: true,
      createdAt: Date.now(),
      rotationCount: 0
    });
    
    console.log(`✅ Key pair generated for node ${this.nodeId}`);
    
    // Schedule key rotation
    this.scheduleKeyRotation();
  }

  scheduleKeyRotation() {
    setTimeout(() => {
      this.rotateNodeKeys();
    }, this.keyRotationInterval);
  }

  rotateNodeKeys() {
    console.log(`🔄 Rotating keys for node ${this.nodeId}`);
    
    const oldKey = this.nodeKeys.get(this.nodeId);
    this.generateNodeKeyPair();
    
    const newKey = this.nodeKeys.get(this.nodeId);
    newKey.rotationCount = (oldKey?.rotationCount || 0) + 1;
    
    this.emit('keyRotated', {
      nodeId: this.nodeId,
      rotationCount: newKey.rotationCount,
      timestamp: Date.now()
    });
    
    // Clean up old signatures that used the old key
    this.invalidateOldSignatures(oldKey.publicKey);
    
    // Schedule next rotation
    this.scheduleKeyRotation();
  }

  registerNodePublicKey(nodeId, publicKey, certificate) {
    console.log(`📝 Registering public key for node ${nodeId}`);
    
    // Verify certificate if provided
    let verified = false;
    if (certificate && this.verifyCertificate(certificate)) {
      verified = true;
    }
    
    this.nodeKeys.set(nodeId, {
      publicKey,
      verified,
      certificate,
      registeredAt: Date.now()
    });
    
    this.emit('nodeKeyRegistered', {
      nodeId,
      verified,
      timestamp: Date.now()
    });
    
    return verified;
  }

  getPublicKey(nodeId) {
    const keyInfo = this.nodeKeys.get(nodeId);
    return keyInfo?.publicKey;
  }

  // Message Authentication

  signMessage(message, includeProof = false) {
    try {
      const messageString = this.canonicalizeMessage(message);
      const signature = crypto.sign('sha256', Buffer.from(messageString), this.privateKey);
      
      const authInfo = {
        signature: signature.toString('base64'),
        nodeId: this.nodeId,
        timestamp: Date.now(),
        nonce: crypto.randomBytes(16).toString('hex'),
        sequenceNumber: this.getNextSequenceNumber(this.nodeId)
      };
      
      // Add zero-knowledge proof if requested
      if (includeProof) {
        authInfo.zkProof = this.generateZKProof(message);
      }
      
      // Store nonce to prevent replay
      this.messageNonces.set(authInfo.nonce, {
        nodeId: this.nodeId,
        timestamp: authInfo.timestamp,
        used: true
      });
      
      return authInfo;
    } catch (error) {
      console.error(`❌ Failed to sign message: ${error.message}`);
      throw error;
    }
  }

  verifyMessageSignature(message, authInfo) {
    try {
      // Check if message is from blacklisted node
      if (this.blacklist.has(authInfo.nodeId)) {
        throw new Error(`Message from blacklisted node: ${authInfo.nodeId}`);
      }
      
      // Check rate limits
      if (!this.checkRateLimit(authInfo.nodeId)) {
        throw new Error(`Rate limit exceeded for node: ${authInfo.nodeId}`);
      }
      
      // Verify nonce (prevent replay attacks)
      if (!this.verifyNonce(authInfo.nonce, authInfo.nodeId, authInfo.timestamp)) {
        throw new Error('Invalid or reused nonce');
      }
      
      // Verify sequence number
      if (!this.verifySequenceNumber(authInfo.nodeId, authInfo.sequenceNumber)) {
        throw new Error('Invalid sequence number');
      }
      
      // Get public key
      const publicKey = this.getPublicKey(authInfo.nodeId);
      if (!publicKey) {
        throw new Error(`No public key found for node: ${authInfo.nodeId}`);
      }
      
      // Verify signature
      const messageString = this.canonicalizeMessage(message);
      const signature = Buffer.from(authInfo.signature, 'base64');
      
      const isValid = crypto.verify('sha256', Buffer.from(messageString), publicKey, signature);
      
      if (!isValid) {
        this.recordSuspiciousActivity(authInfo.nodeId, 'invalid_signature');
        throw new Error('Invalid signature');
      }
      
      // Verify zero-knowledge proof if present
      if (authInfo.zkProof && !this.verifyZKProof(message, authInfo.zkProof, authInfo.nodeId)) {
        throw new Error('Invalid zero-knowledge proof');
      }
      
      // Cache successful verification
      const cacheKey = this.computeSignatureCacheKey(message, authInfo);
      this.signatureCache.set(cacheKey, {
        valid: true,
        timestamp: Date.now(),
        nodeId: authInfo.nodeId
      });
      
      // Update sequence counter
      this.sequenceCounters.set(authInfo.nodeId, authInfo.sequenceNumber);
      
      return true;
    } catch (error) {
      console.warn(`⚠️  Signature verification failed: ${error.message}`);
      this.recordSuspiciousActivity(authInfo.nodeId, 'verification_failed', error.message);
      return false;
    }
  }

  // Threshold Signatures

  initializeThresholdSignatures() {
    console.log(`🔐 Initializing threshold signature scheme (t=${this.thresholdScheme.threshold})`);
    
    // Generate threshold key shares (simplified implementation)
    // In a real system, this would use proper threshold cryptography
    for (let i = 1; i <= this.thresholdScheme.threshold + 1; i++) {
      const share = crypto.randomBytes(32);
      this.thresholdScheme.shares.set(i, share);
      
      // Generate corresponding public share
      const publicShare = crypto.createHash('sha256').update(share).digest();
      this.thresholdScheme.publicShares.set(i, publicShare);
    }
    
    console.log(`✅ Generated ${this.thresholdScheme.shares.size} threshold key shares`);
  }

  generateThresholdSignature(message, shareIds) {
    if (shareIds.length < this.thresholdScheme.threshold) {
      throw new Error(`Insufficient shares: need ${this.thresholdScheme.threshold}, got ${shareIds.length}`);
    }
    
    console.log(`🔐 Generating threshold signature with ${shareIds.length} shares`);
    
    const messageHash = crypto.createHash('sha256').update(JSON.stringify(message)).digest();
    const signatures = [];
    
    // Generate partial signatures from each share
    for (const shareId of shareIds) {
      const share = this.thresholdScheme.shares.get(shareId);
      if (!share) {
        throw new Error(`Share ${shareId} not found`);
      }
      
      const partialSig = crypto.createHmac('sha256', share).update(messageHash).digest();
      signatures.push({
        shareId,
        signature: partialSig.toString('base64')
      });
    }
    
    // Combine signatures (simplified - real implementation would use proper threshold crypto)
    const combinedSignature = this.combineThresholdSignatures(signatures);
    
    return {
      signature: combinedSignature,
      shares: shareIds,
      timestamp: Date.now(),
      threshold: this.thresholdScheme.threshold
    };
  }

  combineThresholdSignatures(signatures) {
    // Simplified combination - real implementation would use Lagrange interpolation
    const combined = Buffer.alloc(32);
    
    for (const { signature } of signatures) {
      const sigBuffer = Buffer.from(signature, 'base64');
      for (let i = 0; i < 32; i++) {
        combined[i] ^= sigBuffer[i % sigBuffer.length];
      }
    }
    
    return combined.toString('base64');
  }

  verifyThresholdSignature(message, thresholdSig) {
    try {
      const messageHash = crypto.createHash('sha256').update(JSON.stringify(message)).digest();
      
      // Recreate the threshold signature for verification
      const reconstructedSig = this.reconstructThresholdSignature(message, thresholdSig.shares);
      
      return reconstructedSig === thresholdSig.signature;
    } catch (error) {
      console.warn(`⚠️  Threshold signature verification failed: ${error.message}`);
      return false;
    }
  }

  // Zero-Knowledge Proofs

  initializeZKProofs() {
    console.log('🧮 Initializing zero-knowledge proof system');
    
    // Initialize proof parameters
    this.zkParams = {
      generator: crypto.randomBytes(32),
      modulus: crypto.randomBytes(256), // Simplified - real implementation would use proper groups
      challenges: new Map()
    };
  }

  generateZKProof(message) {
    // Simplified ZK proof - real implementation would use proper ZK protocols
    const commitment = crypto.randomBytes(32);
    const challenge = crypto.createHash('sha256').update(commitment).update(JSON.stringify(message)).digest();
    const response = crypto.createHash('sha256').update(this.privateKey).update(challenge).digest();
    
    const proof = {
      commitment: commitment.toString('base64'),
      challenge: challenge.toString('base64'),
      response: response.toString('base64'),
      timestamp: Date.now()
    };
    
    // Store for verification
    const proofId = crypto.createHash('sha256').update(JSON.stringify(proof)).digest('hex');
    this.zkProofCache.set(proofId, {
      proof,
      message,
      nodeId: this.nodeId,
      verified: false
    });
    
    return proof;
  }

  verifyZKProof(message, proof, nodeId) {
    try {
      // Recreate challenge
      const commitment = Buffer.from(proof.commitment, 'base64');
      const expectedChallenge = crypto.createHash('sha256').update(commitment).update(JSON.stringify(message)).digest();
      const providedChallenge = Buffer.from(proof.challenge, 'base64');
      
      if (!expectedChallenge.equals(providedChallenge)) {
        return false;
      }
      
      // Verify response (simplified verification)
      const publicKey = this.getPublicKey(nodeId);
      if (!publicKey) {
        return false;
      }
      
      const expectedResponse = crypto.createHash('sha256').update(publicKey).update(providedChallenge).digest();
      const providedResponse = Buffer.from(proof.response, 'base64');
      
      // Note: This is a simplified verification - real ZK proofs would be more complex
      const isValid = expectedResponse.equals(providedResponse);
      
      if (isValid) {
        console.log(`✅ ZK proof verified for node ${nodeId}`);
      } else {
        console.warn(`❌ ZK proof verification failed for node ${nodeId}`);
      }
      
      return isValid;
    } catch (error) {
      console.error(`❌ ZK proof verification error: ${error.message}`);
      return false;
    }
  }

  // Attack Detection and Prevention

  checkRateLimit(nodeId) {
    const now = Date.now();
    const window = 60000; // 1 minute window
    const limit = 1000; // Max messages per window
    
    if (!this.rateLimits.has(nodeId)) {
      this.rateLimits.set(nodeId, {
        count: 0,
        windowStart: now
      });
    }
    
    const rateLimit = this.rateLimits.get(nodeId);
    
    // Reset window if needed
    if (now - rateLimit.windowStart > window) {
      rateLimit.count = 0;
      rateLimit.windowStart = now;
    }
    
    rateLimit.count++;
    
    if (rateLimit.count > limit) {
      console.warn(`⚠️  Rate limit exceeded for node ${nodeId}: ${rateLimit.count} messages`);
      return false;
    }
    
    return true;
  }

  verifyNonce(nonce, nodeId, timestamp) {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes
    
    // Check if nonce is too old
    if (now - timestamp > maxAge) {
      console.warn(`⚠️  Nonce too old: ${now - timestamp}ms`);
      return false;
    }
    
    // Check if nonce was already used
    const existingNonce = this.messageNonces.get(nonce);
    if (existingNonce) {
      console.warn(`⚠️  Nonce reuse detected: ${nonce}`);
      return false;
    }
    
    return true;
  }

  verifySequenceNumber(nodeId, sequenceNumber) {
    const lastSequence = this.sequenceCounters.get(nodeId) || 0;
    
    // Sequence number must be incrementing
    if (sequenceNumber <= lastSequence) {
      console.warn(`⚠️  Invalid sequence number from ${nodeId}: ${sequenceNumber} <= ${lastSequence}`);
      return false;
    }
    
    // Check for reasonable increment (prevent huge jumps)
    if (sequenceNumber > lastSequence + 1000) {
      console.warn(`⚠️  Suspicious sequence jump from ${nodeId}: ${lastSequence} → ${sequenceNumber}`);
      return false;
    }
    
    return true;
  }

  getNextSequenceNumber(nodeId) {
    const current = this.sequenceCounters.get(nodeId) || 0;
    const next = current + 1;
    this.sequenceCounters.set(nodeId, next);
    return next;
  }

  recordSuspiciousActivity(nodeId, activityType, details = '') {
    const now = Date.now();
    
    if (!this.suspiciousActivity.has(nodeId)) {
      this.suspiciousActivity.set(nodeId, []);
    }
    
    const activities = this.suspiciousActivity.get(nodeId);
    activities.push({
      type: activityType,
      details,
      timestamp: now
    });
    
    // Keep only recent activities
    const cutoff = now - 3600000; // 1 hour
    this.suspiciousActivity.set(
      nodeId, 
      activities.filter(a => a.timestamp > cutoff)
    );
    
    console.warn(`⚠️  Suspicious activity from ${nodeId}: ${activityType} - ${details}`);
    
    // Check if node should be blacklisted
    if (activities.length >= 10) {
      this.blacklistNode(nodeId, 'Multiple suspicious activities');
    }
    
    this.emit('suspiciousActivity', {
      nodeId,
      activityType,
      details,
      totalActivities: activities.length,
      timestamp: now
    });
  }

  blacklistNode(nodeId, reason) {
    if (this.blacklist.has(nodeId)) return;
    
    this.blacklist.add(nodeId);
    console.error(`🚨 Node ${nodeId} blacklisted: ${reason}`);
    
    this.emit('nodeBlacklisted', {
      nodeId,
      reason,
      timestamp: Date.now()
    });
    
    // Auto-remove from blacklist after 24 hours
    setTimeout(() => {
      this.blacklist.delete(nodeId);
      console.log(`✅ Node ${nodeId} removed from blacklist`);
    }, 86400000);
  }

  // Security Monitoring

  startSecurityMonitoring() {
    setInterval(() => {
      this.performSecurityAudit();
      this.cleanupSecurityData();
    }, 60000); // Every minute
  }

  performSecurityAudit() {
    const now = Date.now();
    
    // Check for expired signatures
    let expiredSignatures = 0;
    for (const [key, cache] of this.signatureCache) {
      if (now - cache.timestamp > 3600000) { // 1 hour
        this.signatureCache.delete(key);
        expiredSignatures++;
      }
    }
    
    // Check for suspicious patterns
    let suspiciousNodes = 0;
    for (const [nodeId, activities] of this.suspiciousActivity) {
      if (activities.length >= 5) {
        suspiciousNodes++;
      }
    }
    
    // Check nonce usage patterns
    let oldNonces = 0;
    for (const [nonce, info] of this.messageNonces) {
      if (now - info.timestamp > 300000) { // 5 minutes
        this.messageNonces.delete(nonce);
        oldNonces++;
      }
    }
    
    if (expiredSignatures > 0 || suspiciousNodes > 0 || oldNonces > 0) {
      console.log(`🔍 Security audit: expired signatures: ${expiredSignatures}, suspicious nodes: ${suspiciousNodes}, old nonces: ${oldNonces}`);
    }
    
    this.emit('securityAudit', {
      expiredSignatures,
      suspiciousNodes,
      oldNonces,
      blacklistedNodes: this.blacklist.size,
      timestamp: now
    });
  }

  cleanupSecurityData() {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour
    
    // Cleanup old nonces
    for (const [nonce, info] of this.messageNonces) {
      if (now - info.timestamp > maxAge) {
        this.messageNonces.delete(nonce);
      }
    }
    
    // Cleanup signature cache
    for (const [key, cache] of this.signatureCache) {
      if (now - cache.timestamp > maxAge) {
        this.signatureCache.delete(key);
      }
    }
    
    // Cleanup ZK proof cache
    for (const [proofId, proofData] of this.zkProofCache) {
      if (now - proofData.proof.timestamp > maxAge) {
        this.zkProofCache.delete(proofId);
      }
    }
  }

  // Utility Methods

  canonicalizeMessage(message) {
    // Create canonical string representation for signing
    const { signature, zkProof, ...messageWithoutAuth } = message;
    return JSON.stringify(messageWithoutAuth, Object.keys(messageWithoutAuth).sort());
  }

  computeSignatureCacheKey(message, authInfo) {
    return crypto.createHash('sha256')
      .update(JSON.stringify(message))
      .update(authInfo.signature)
      .digest('hex');
  }

  reconstructThresholdSignature(message, shareIds) {
    // Simplified reconstruction - real implementation would be more sophisticated
    const messageHash = crypto.createHash('sha256').update(JSON.stringify(message)).digest();
    const combined = Buffer.alloc(32);
    
    for (const shareId of shareIds) {
      const share = this.thresholdScheme.shares.get(shareId);
      if (share) {
        const partialSig = crypto.createHmac('sha256', share).update(messageHash).digest();
        for (let i = 0; i < 32; i++) {
          combined[i] ^= partialSig[i];
        }
      }
    }
    
    return combined.toString('base64');
  }

  invalidateOldSignatures(oldPublicKey) {
    let invalidated = 0;
    
    for (const [key, cache] of this.signatureCache) {
      // This is a simplified check - real implementation would track key associations
      if (cache.nodeId === this.nodeId) {
        this.signatureCache.delete(key);
        invalidated++;
      }
    }
    
    console.log(`🔄 Invalidated ${invalidated} signatures after key rotation`);
  }

  verifyCertificate(certificate) {
    // Simplified certificate verification
    // Real implementation would verify against trusted CA
    try {
      const cert = crypto.createVerify('sha256');
      cert.update(certificate.data);
      return cert.verify(certificate.issuer, certificate.signature, 'base64');
    } catch (error) {
      console.warn(`⚠️  Certificate verification failed: ${error.message}`);
      return false;
    }
  }

  getSecurityMetrics() {
    return {
      nodeKeys: this.nodeKeys.size,
      signatureCache: this.signatureCache.size,
      activeNonces: this.messageNonces.size,
      blacklistedNodes: this.blacklist.size,
      suspiciousNodes: this.suspiciousActivity.size,
      thresholdShares: this.thresholdScheme.shares.size,
      zkProofCache: this.zkProofCache.size,
      rateLimitedNodes: Array.from(this.rateLimits.keys()).length
    };
  }

  getStatus() {
    return {
      nodeId: this.nodeId,
      keySize: this.keySize,
      publicKeyRegistered: this.nodeKeys.has(this.nodeId),
      thresholdSchemeEnabled: this.thresholdScheme.shares.size > 0,
      zkProofsEnabled: Object.keys(this.zkParams).length > 0,
      blacklistedNodes: this.blacklist.size,
      suspiciousActivities: Array.from(this.suspiciousActivity.values()).reduce((sum, acts) => sum + acts.length, 0),
      securityLevel: this.calculateSecurityLevel(),
      lastAudit: Date.now()
    };
  }

  calculateSecurityLevel() {
    const maxScore = 100;
    let score = maxScore;
    
    // Deduct points for security issues
    score -= this.blacklist.size * 10;
    score -= Math.min(this.suspiciousActivity.size * 5, 30);
    
    // Bonus for security features
    if (this.thresholdScheme.shares.size > 0) score += 10;
    if (Object.keys(this.zkParams).length > 0) score += 10;
    if (this.keySize >= 2048) score += 5;
    
    return Math.max(0, Math.min(maxScore, score));
  }
}

module.exports = SecurityManager;