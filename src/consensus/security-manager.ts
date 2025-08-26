/**
 * Security Manager
 * 
 * Provides comprehensive security and integrity measures for consensus systems.
 * Implements cryptographic validation, trust management, threat detection,
 * and attack mitigation strategies.
 */

import { EventEmitter } from 'events';
import { createHash, createSign, createVerify, randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export enum ThreatLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum AttackType {
  SYBIL = 'sybil',
  REPLAY = 'replay',
  DOS = 'dos',
  ECLIPSE = 'eclipse',
  ROUTING = 'routing',
  MESSAGE_TAMPERING = 'message_tampering',
  TIMING = 'timing',
  COLLUSION = 'collusion'
}

export interface SecurityNode {
  nodeId: string;
  publicKey: Buffer;
  trustScore: number;
  reputation: number;
  lastActivity: number;
  messageCount: number;
  suspiciousActivity: number;
  verificationCount: number;
  stake?: number;
  identity?: {
    certificate: Buffer;
    issuer: string;
    validUntil: number;
  };
}

export interface ThreatDetection {
  threatId: string;
  type: AttackType;
  level: ThreatLevel;
  sourceNodes: string[];
  targetNodes: string[];
  description: string;
  evidence: any[];
  timestamp: number;
  mitigationActions: string[];
  resolved: boolean;
}

export interface SecurityMessage {
  nodeId: string;
  signature: Buffer;
  timestamp: number;
  nonce: Buffer;
  publicKey: Buffer;
  payload: any;
  hash: string;
}

export interface TrustMetrics {
  directTrust: number; // Direct interactions
  networkTrust: number; // Network-derived trust
  stakeTrust: number; // Based on economic stake
  temporalTrust: number; // Based on consistent behavior over time
  compositeTrust: number; // Weighted combination
}

export interface SecurityConfiguration {
  signatureAlgorithm: 'RSA' | 'ECDSA' | 'EdDSA';
  hashAlgorithm: 'SHA-256' | 'SHA-3-256' | 'BLAKE2b';
  keySize: number;
  nonceSize: number;
  maxMessageAge: number;
  trustDecayRate: number;
  suspicionThreshold: number;
  blacklistThreshold: number;
  rateLimiting: {
    maxMessagesPerSecond: number;
    maxBytesPerSecond: number;
    windowSize: number;
  };
  cryptographicProofs: boolean;
  zeroKnowledgeProofs: boolean;
  thresholdSignatures: boolean;
}

export interface CryptographicProof {
  proofId: string;
  type: 'signature' | 'hash' | 'merkle' | 'zk';
  statement: string;
  proof: Buffer;
  publicInputs: any[];
  timestamp: number;
  verifier: string;
  isValid?: boolean;
}

export class SecurityManager extends EventEmitter {
  private nodeId: string;
  private privateKey: Buffer;
  private publicKey: Buffer;
  private nodes: Map<string, SecurityNode> = new Map();
  private configuration: SecurityConfiguration;
  
  // Security state
  private messageNonces: Set<string> = new Set();
  private nonceWindow: Map<string, number> = new Map();
  private rateLimiters: Map<string, {
    messages: number[];
    bytes: number[];
    lastReset: number;
  }> = new Map();
  
  // Threat detection
  private threats: Map<string, ThreatDetection> = new Map();
  private suspiciousNodes: Set<string> = new Set();
  private blacklistedNodes: Set<string> = new Set();
  private behaviorPatterns: Map<string, {
    messageTimings: number[];
    messageTypes: string[];
    networkActivity: number[];
  }> = new Map();
  
  // Trust network
  private trustGraph: Map<string, Map<string, number>> = new Map();
  private reputationHistory: Map<string, { score: number; timestamp: number }[]> = new Map();
  
  // Cryptographic state
  private cryptographicProofs: Map<string, CryptographicProof> = new Map();
  private certificateAuthorities: Map<string, Buffer> = new Map();
  
  // Performance metrics
  private verificationLatency: number[] = [];
  private threatsDetected: number = 0;
  private threatsResolved: number = 0;
  private messagesValidated: number = 0;

  constructor(nodeId: string, privateKey: Buffer, publicKey: Buffer, configuration: SecurityConfiguration) {
    super();
    
    this.nodeId = nodeId;
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.configuration = configuration;
    
    this.startThreatDetection();
    this.startTrustDecay();
    this.startNonceCleanup();
    
    this.emit('initialized', {
      nodeId: this.nodeId,
      signatureAlgorithm: this.configuration.signatureAlgorithm,
      hashAlgorithm: this.configuration.hashAlgorithm
    });
  }

  /**
   * Register a node in the security system
   */
  registerNode(node: SecurityNode): void {
    // Validate node certificate if present
    if (node.identity?.certificate) {
      if (!this.validateCertificate(node.identity.certificate, node.identity.issuer)) {
        throw new Error(`Invalid certificate for node ${node.nodeId}`);
      }
    }
    
    // Initialize trust metrics
    const existingNode = this.nodes.get(node.nodeId);
    const initialTrust = existingNode ? existingNode.trustScore : 0.5;
    
    this.nodes.set(node.nodeId, {
      ...node,
      trustScore: initialTrust,
      reputation: existingNode ? existingNode.reputation : 1.0,
      lastActivity: Date.now(),
      messageCount: existingNode ? existingNode.messageCount : 0,
      suspiciousActivity: existingNode ? existingNode.suspiciousActivity : 0,
      verificationCount: existingNode ? existingNode.verificationCount : 0
    });
    
    // Initialize trust relationships
    if (!this.trustGraph.has(node.nodeId)) {
      this.trustGraph.set(node.nodeId, new Map());
    }
    
    // Initialize behavior tracking
    this.behaviorPatterns.set(node.nodeId, {
      messageTimings: [],
      messageTypes: [],
      networkActivity: []
    });
    
    this.emit('node_registered', {
      nodeId: node.nodeId,
      trustScore: initialTrust,
      hasCertificate: !!node.identity?.certificate
    });
  }

  /**
   * Sign a message with cryptographic proof
   */
  signMessage(message: any): SecurityMessage {
    const timestamp = Date.now();
    const nonce = randomBytes(this.configuration.nonceSize);
    const payload = {
      ...message,
      timestamp,
      nonce: nonce.toString('hex')
    };
    
    // Calculate message hash
    const hash = this.calculateHash(payload);
    
    // Create signature
    const sign = createSign(this.mapSignatureAlgorithm(this.configuration.signatureAlgorithm));
    sign.update(hash);
    const signature = sign.sign(this.privateKey);
    
    const securityMessage: SecurityMessage = {
      nodeId: this.nodeId,
      signature,
      timestamp,
      nonce,
      publicKey: this.publicKey,
      payload,
      hash
    };
    
    // Store nonce to prevent replay attacks
    this.messageNonces.add(nonce.toString('hex'));
    this.nonceWindow.set(nonce.toString('hex'), timestamp);
    
    this.emit('message_signed', {
      messageId: hash.substring(0, 16),
      nodeId: this.nodeId,
      timestamp
    });
    
    return securityMessage;
  }

  /**
   * Verify a message signature and integrity
   */
  async verifyMessage(message: SecurityMessage): Promise<{
    isValid: boolean;
    trustScore: number;
    threats: AttackType[];
    reason?: string;
  }> {
    const startTime = Date.now();
    const threats: AttackType[] = [];
    
    try {
      // Check if sender is blacklisted
      if (this.blacklistedNodes.has(message.nodeId)) {
        return {
          isValid: false,
          trustScore: 0,
          threats: [AttackType.SYBIL],
          reason: 'Sender is blacklisted'
        };
      }
      
      // Check message age
      const age = Date.now() - message.timestamp;
      if (age > this.configuration.maxMessageAge) {
        threats.push(AttackType.REPLAY);
        return {
          isValid: false,
          trustScore: 0,
          threats,
          reason: 'Message too old'
        };
      }
      
      // Check for replay attack
      if (this.messageNonces.has(message.nonce.toString('hex'))) {
        threats.push(AttackType.REPLAY);
        await this.reportThreat(AttackType.REPLAY, [message.nodeId], [], {
          nonce: message.nonce.toString('hex'),
          timestamp: message.timestamp
        });
        return {
          isValid: false,
          trustScore: 0,
          threats,
          reason: 'Replay attack detected'
        };
      }
      
      // Get sender node information
      const senderNode = this.nodes.get(message.nodeId);
      if (!senderNode) {
        return {
          isValid: false,
          trustScore: 0,
          threats: [AttackType.SYBIL],
          reason: 'Unknown sender'
        };
      }
      
      // Rate limiting check
      if (!this.checkRateLimit(message.nodeId, JSON.stringify(message).length)) {
        threats.push(AttackType.DOS);
        await this.reportThreat(AttackType.DOS, [message.nodeId], [], {
          messageSize: JSON.stringify(message).length
        });
      }
      
      // Verify signature
      const verify = createVerify(this.mapSignatureAlgorithm(this.configuration.signatureAlgorithm));
      verify.update(message.hash);
      
      const isValidSignature = verify.verify(senderNode.publicKey, message.signature);
      
      if (!isValidSignature) {
        threats.push(AttackType.MESSAGE_TAMPERING);
        await this.reportThreat(AttackType.MESSAGE_TAMPERING, [message.nodeId], [], {
          messageHash: message.hash,
          signature: message.signature.toString('hex')
        });
        
        return {
          isValid: false,
          trustScore: senderNode.trustScore,
          threats,
          reason: 'Invalid signature'
        };
      }
      
      // Verify message hash
      const calculatedHash = this.calculateHash(message.payload);
      if (calculatedHash !== message.hash) {
        threats.push(AttackType.MESSAGE_TAMPERING);
        return {
          isValid: false,
          trustScore: senderNode.trustScore,
          threats,
          reason: 'Hash mismatch'
        };
      }
      
      // Update node metrics
      senderNode.messageCount++;
      senderNode.lastActivity = Date.now();
      senderNode.verificationCount++;
      
      // Track message timing for behavioral analysis
      this.trackBehavior(message.nodeId, 'message', Date.now());
      
      // Store nonce
      this.messageNonces.add(message.nonce.toString('hex'));
      this.nonceWindow.set(message.nonce.toString('hex'), message.timestamp);
      
      this.messagesValidated++;
      
      // Track verification latency
      const verificationTime = Date.now() - startTime;
      this.verificationLatency.push(verificationTime);
      if (this.verificationLatency.length > 1000) {
        this.verificationLatency.shift();
      }
      
      this.emit('message_verified', {
        messageId: message.hash.substring(0, 16),
        senderId: message.nodeId,
        trustScore: senderNode.trustScore,
        verificationTime,
        threatsDetected: threats
      });
      
      return {
        isValid: true,
        trustScore: senderNode.trustScore,
        threats,
        reason: undefined
      };
      
    } catch (error) {
      this.emit('verification_error', {
        messageId: message.hash?.substring(0, 16) || 'unknown',
        senderId: message.nodeId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        isValid: false,
        trustScore: 0,
        threats,
        reason: `Verification error: ${error}`
      };
    }
  }

  /**
   * Update trust score for a node
   */
  updateTrust(
    nodeId: string, 
    interaction: 'positive' | 'negative' | 'neutral',
    weight: number = 1.0,
    evidence?: any
  ): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    
    const currentTrust = node.trustScore;
    let adjustment = 0;
    
    switch (interaction) {
      case 'positive':
        adjustment = 0.05 * weight;
        break;
      case 'negative':
        adjustment = -0.1 * weight;
        node.suspiciousActivity++;
        break;
      case 'neutral':
        adjustment = 0.01 * weight;
        break;
    }
    
    // Apply adjustment with diminishing returns
    const newTrust = Math.max(0, Math.min(1, currentTrust + adjustment * (1 - Math.abs(currentTrust - 0.5))));
    node.trustScore = newTrust;
    
    // Update reputation with exponential moving average
    node.reputation = 0.9 * node.reputation + 0.1 * newTrust;
    
    // Store in reputation history
    if (!this.reputationHistory.has(nodeId)) {
      this.reputationHistory.set(nodeId, []);
    }
    
    const history = this.reputationHistory.get(nodeId)!;
    history.push({ score: newTrust, timestamp: Date.now() });
    
    // Keep only recent history (last 1000 entries)
    if (history.length > 1000) {
      history.shift();
    }
    
    // Check for suspicious behavior
    if (node.suspiciousActivity > this.configuration.suspicionThreshold) {
      this.suspiciousNodes.add(nodeId);
      this.emit('node_suspicious', {
        nodeId,
        suspiciousActivity: node.suspiciousActivity,
        trustScore: newTrust,
        evidence
      });
    }
    
    // Check for blacklisting
    if (newTrust < 0.2 && node.suspiciousActivity > this.configuration.blacklistThreshold) {
      this.blacklistNode(nodeId, 'Low trust and high suspicious activity');
    }
    
    this.emit('trust_updated', {
      nodeId,
      interaction,
      oldTrust: currentTrust,
      newTrust,
      reputation: node.reputation,
      weight
    });
  }

  /**
   * Calculate comprehensive trust metrics
   */
  calculateTrustMetrics(nodeId: string): TrustMetrics | null {
    const node = this.nodes.get(nodeId);
    if (!node) return null;
    
    // Direct trust based on direct interactions
    const directTrust = node.trustScore;
    
    // Network trust based on recommendations from trusted nodes
    const networkTrust = this.calculateNetworkTrust(nodeId);
    
    // Stake-based trust (if applicable)
    const stakeTrust = node.stake ? Math.min(1, node.stake / 1000000) : 0; // Normalize stake
    
    // Temporal trust based on consistent behavior over time
    const temporalTrust = this.calculateTemporalTrust(nodeId);
    
    // Composite trust score
    const compositeTrust = (
      directTrust * 0.4 +
      networkTrust * 0.3 +
      stakeTrust * 0.2 +
      temporalTrust * 0.1
    );
    
    return {
      directTrust,
      networkTrust,
      stakeTrust,
      temporalTrust,
      compositeTrust: Math.max(0, Math.min(1, compositeTrust))
    };
  }

  /**
   * Generate a zero-knowledge proof
   */
  async generateZKProof(
    statement: string,
    witness: any,
    publicInputs: any[]
  ): Promise<CryptographicProof> {
    // Simplified ZK proof generation (in practice, would use a ZK library)
    const proofId = this.generateProofId();
    const timestamp = Date.now();
    
    // Create a commitment to the witness
    const witnessHash = this.calculateHash(witness);
    const commitment = this.calculateHash({ statement, witnessHash, publicInputs, timestamp });
    
    // Create proof (simplified - real implementation would use proper ZK protocols)
    const proof = Buffer.from(JSON.stringify({
      commitment,
      witnessHash: witnessHash.substring(0, 32), // Partial reveal
      randomness: randomBytes(32).toString('hex')
    }));
    
    const zkProof: CryptographicProof = {
      proofId,
      type: 'zk',
      statement,
      proof,
      publicInputs,
      timestamp,
      verifier: this.nodeId
    };
    
    this.cryptographicProofs.set(proofId, zkProof);
    
    this.emit('zk_proof_generated', {
      proofId,
      statement,
      timestamp
    });
    
    return zkProof;
  }

  /**
   * Verify a zero-knowledge proof
   */
  async verifyZKProof(proof: CryptographicProof): Promise<boolean> {
    try {
      // Simplified verification (real implementation would use proper ZK verification)
      const proofData = JSON.parse(proof.proof.toString());
      
      // Verify commitment structure
      if (!proofData.commitment || !proofData.witnessHash || !proofData.randomness) {
        return false;
      }
      
      // Verify age
      if (Date.now() - proof.timestamp > this.configuration.maxMessageAge) {
        return false;
      }
      
      // Store verification result
      proof.isValid = true;
      
      this.emit('zk_proof_verified', {
        proofId: proof.proofId,
        statement: proof.statement,
        isValid: true
      });
      
      return true;
      
    } catch (error) {
      this.emit('zk_proof_verification_failed', {
        proofId: proof.proofId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return false;
    }
  }

  /**
   * Blacklist a node
   */
  private blacklistNode(nodeId: string, reason: string): void {
    this.blacklistedNodes.add(nodeId);
    this.suspiciousNodes.delete(nodeId);
    
    this.emit('node_blacklisted', {
      nodeId,
      reason,
      timestamp: Date.now()
    });
  }

  /**
   * Report a security threat
   */
  private async reportThreat(
    type: AttackType,
    sourceNodes: string[],
    targetNodes: string[],
    evidence: any
  ): Promise<void> {
    const threatId = this.generateThreatId();
    const level = this.assessThreatLevel(type, evidence);
    
    const threat: ThreatDetection = {
      threatId,
      type,
      level,
      sourceNodes,
      targetNodes,
      description: this.getThreatDescription(type),
      evidence: [evidence],
      timestamp: Date.now(),
      mitigationActions: this.getMitigationActions(type),
      resolved: false
    };
    
    this.threats.set(threatId, threat);
    this.threatsDetected++;
    
    // Apply immediate mitigation
    await this.applyMitigation(threat);
    
    this.emit('threat_detected', {
      threatId,
      type,
      level,
      sourceNodes,
      mitigationActions: threat.mitigationActions
    });
  }

  /**
   * Apply threat mitigation measures
   */
  private async applyMitigation(threat: ThreatDetection): Promise<void> {
    switch (threat.type) {
      case AttackType.DOS:
        // Increase rate limiting for source nodes
        for (const nodeId of threat.sourceNodes) {
          this.strengthenRateLimit(nodeId);
        }
        break;
        
      case AttackType.SYBIL:
        // Require stronger identity verification
        for (const nodeId of threat.sourceNodes) {
          const node = this.nodes.get(nodeId);
          if (node) {
            node.trustScore *= 0.5; // Reduce trust
          }
        }
        break;
        
      case AttackType.MESSAGE_TAMPERING:
        // Blacklist repeat offenders
        for (const nodeId of threat.sourceNodes) {
          const node = this.nodes.get(nodeId);
          if (node && node.suspiciousActivity > 3) {
            this.blacklistNode(nodeId, 'Repeated message tampering');
          }
        }
        break;
        
      case AttackType.REPLAY:
        // Strengthen nonce requirements
        this.configuration.nonceSize = Math.min(32, this.configuration.nonceSize + 4);
        break;
    }
    
    threat.resolved = true;
    this.threatsResolved++;
    
    this.emit('mitigation_applied', {
      threatId: threat.threatId,
      type: threat.type,
      actions: threat.mitigationActions
    });
  }

  /**
   * Private helper methods
   */

  private calculateHash(data: any): string {
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    
    switch (this.configuration.hashAlgorithm) {
      case 'SHA-256':
        return createHash('sha256').update(content).digest('hex');
      case 'SHA-3-256':
        return createHash('sha3-256').update(content).digest('hex');
      case 'BLAKE2b':
        // Fallback to SHA-256 if BLAKE2b not available
        return createHash('sha256').update(content).digest('hex');
      default:
        return createHash('sha256').update(content).digest('hex');
    }
  }

  private mapSignatureAlgorithm(algorithm: string): string {
    switch (algorithm) {
      case 'RSA':
        return 'RSA-SHA256';
      case 'ECDSA':
        return 'ecdsa-with-SHA256';
      case 'EdDSA':
        return 'ecdsa-with-SHA256'; // Fallback
      default:
        return 'RSA-SHA256';
    }
  }

  private checkRateLimit(nodeId: string, messageSize: number): boolean {
    const now = Date.now();
    const windowSize = this.configuration.rateLimiting.windowSize;
    
    if (!this.rateLimiters.has(nodeId)) {
      this.rateLimiters.set(nodeId, {
        messages: [],
        bytes: [],
        lastReset: now
      });
    }
    
    const limiter = this.rateLimiters.get(nodeId)!;
    
    // Reset window if needed
    if (now - limiter.lastReset > windowSize) {
      limiter.messages = [];
      limiter.bytes = [];
      limiter.lastReset = now;
    }
    
    // Clean old entries
    const cutoff = now - windowSize;
    limiter.messages = limiter.messages.filter(time => time > cutoff);
    limiter.bytes = limiter.bytes.filter(time => time > cutoff);
    
    // Check limits
    const messageRate = limiter.messages.length;
    const byteRate = limiter.bytes.reduce((sum, _) => sum + messageSize, 0);
    
    if (messageRate >= this.configuration.rateLimiting.maxMessagesPerSecond ||
        byteRate >= this.configuration.rateLimiting.maxBytesPerSecond) {
      return false;
    }
    
    // Add current message
    limiter.messages.push(now);
    limiter.bytes.push(now);
    
    return true;
  }

  private strengthenRateLimit(nodeId: string): void {
    // Reduce rate limits for suspicious nodes
    this.rateLimiters.delete(nodeId); // Force reset with stricter limits
  }

  private trackBehavior(nodeId: string, activityType: string, timestamp: number): void {
    const patterns = this.behaviorPatterns.get(nodeId);
    if (!patterns) return;
    
    switch (activityType) {
      case 'message':
        patterns.messageTimings.push(timestamp);
        if (patterns.messageTimings.length > 100) {
          patterns.messageTimings.shift();
        }
        break;
      case 'network':
        patterns.networkActivity.push(timestamp);
        if (patterns.networkActivity.length > 100) {
          patterns.networkActivity.shift();
        }
        break;
    }
    
    // Analyze patterns for anomalies
    this.analyzeBehaviorPatterns(nodeId, patterns);
  }

  private analyzeBehaviorPatterns(nodeId: string, patterns: any): void {
    // Simple anomaly detection based on message timing
    if (patterns.messageTimings.length >= 10) {
      const intervals = [];
      for (let i = 1; i < patterns.messageTimings.length; i++) {
        intervals.push(patterns.messageTimings[i] - patterns.messageTimings[i - 1]);
      }
      
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
      
      // Detect suspiciously regular timing (possible bot behavior)
      if (variance < avgInterval * 0.1 && avgInterval < 1000) {
        this.updateTrust(nodeId, 'negative', 0.5, { reason: 'suspicious_timing_pattern', variance, avgInterval });
      }
    }
  }

  private calculateNetworkTrust(nodeId: string): number {
    const trustRelations = this.trustGraph.get(nodeId);
    if (!trustRelations || trustRelations.size === 0) return 0.5;
    
    let weightedTrust = 0;
    let totalWeight = 0;
    
    for (const [recommendingNode, trustValue] of trustRelations) {
      const recommender = this.nodes.get(recommendingNode);
      if (recommender && !this.blacklistedNodes.has(recommendingNode)) {
        const weight = recommender.trustScore;
        weightedTrust += trustValue * weight;
        totalWeight += weight;
      }
    }
    
    return totalWeight > 0 ? weightedTrust / totalWeight : 0.5;
  }

  private calculateTemporalTrust(nodeId: string): number {
    const history = this.reputationHistory.get(nodeId);
    if (!history || history.length < 10) return 0.5;
    
    // Calculate trend and stability
    const recentHistory = history.slice(-50); // Last 50 entries
    const scores = recentHistory.map(entry => entry.score);
    
    // Calculate trend (positive trend increases trust)
    let trend = 0;
    for (let i = 1; i < scores.length; i++) {
      trend += scores[i] - scores[i - 1];
    }
    trend /= scores.length - 1;
    
    // Calculate stability (lower variance is better)
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
    const stability = Math.max(0, 1 - variance);
    
    return Math.max(0, Math.min(1, avgScore + trend * 0.1 + stability * 0.2));
  }

  private validateCertificate(certificate: Buffer, issuer: string): boolean {
    // Simplified certificate validation
    const caPublicKey = this.certificateAuthorities.get(issuer);
    if (!caPublicKey) return false;
    
    try {
      // In practice, would perform full X.509 certificate validation
      return certificate.length > 0 && caPublicKey.length > 0;
    } catch {
      return false;
    }
  }

  private assessThreatLevel(type: AttackType, evidence: any): ThreatLevel {
    switch (type) {
      case AttackType.SYBIL:
      case AttackType.ECLIPSE:
        return ThreatLevel.CRITICAL;
      case AttackType.DOS:
      case AttackType.MESSAGE_TAMPERING:
        return ThreatLevel.HIGH;
      case AttackType.REPLAY:
      case AttackType.TIMING:
        return ThreatLevel.MEDIUM;
      default:
        return ThreatLevel.LOW;
    }
  }

  private getThreatDescription(type: AttackType): string {
    const descriptions = {
      [AttackType.SYBIL]: 'Multiple fake identities controlled by single entity',
      [AttackType.REPLAY]: 'Previously sent message being replayed',
      [AttackType.DOS]: 'Denial of service attack through message flooding',
      [AttackType.ECLIPSE]: 'Node isolation attack',
      [AttackType.ROUTING]: 'Routing table manipulation',
      [AttackType.MESSAGE_TAMPERING]: 'Message integrity violation',
      [AttackType.TIMING]: 'Timing-based cryptographic attack',
      [AttackType.COLLUSION]: 'Coordinated attack by multiple nodes'
    };
    
    return descriptions[type] || 'Unknown attack type';
  }

  private getMitigationActions(type: AttackType): string[] {
    const actions = {
      [AttackType.SYBIL]: ['Require stronger identity verification', 'Increase trust requirements', 'Monitor for duplicate behavior patterns'],
      [AttackType.REPLAY]: ['Strengthen nonce requirements', 'Reduce message TTL', 'Implement sequence numbers'],
      [AttackType.DOS]: ['Apply rate limiting', 'Implement message prioritization', 'Block source nodes'],
      [AttackType.ECLIPSE]: ['Diversify peer connections', 'Implement peer monitoring', 'Use trusted bootstrap nodes'],
      [AttackType.ROUTING]: ['Validate routing updates', 'Implement route verification', 'Use multiple routing paths'],
      [AttackType.MESSAGE_TAMPERING]: ['Strengthen cryptographic verification', 'Implement message authentication codes', 'Blacklist repeat offenders'],
      [AttackType.TIMING]: ['Add timing jitter', 'Implement constant-time operations', 'Monitor for timing patterns'],
      [AttackType.COLLUSION]: ['Analyze network behavior patterns', 'Implement collusion detection', 'Diversify consensus participants']
    };
    
    return actions[type] || ['Monitor and analyze'];
  }

  private generateThreatId(): string {
    return `threat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateProofId(): string {
    return `proof-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private startThreatDetection(): void {
    setInterval(() => {
      this.detectThreats();
    }, 30000); // Every 30 seconds
  }

  private detectThreats(): void {
    // Implement threat detection algorithms
    this.detectSybilAttacks();
    this.detectDOSAttacks();
    this.detectCollusionAttacks();
  }

  private detectSybilAttacks(): void {
    // Analyze behavioral patterns for similarity
    const behaviorFingerprints = new Map<string, string>();
    
    for (const [nodeId, patterns] of this.behaviorPatterns) {
      // Create behavior fingerprint
      const fingerprint = this.calculateBehaviorFingerprint(patterns);
      
      // Check for similar fingerprints
      for (const [existingId, existingFingerprint] of behaviorFingerprints) {
        if (existingId !== nodeId && this.behaviorSimilarity(fingerprint, existingFingerprint) > 0.9) {
          this.reportThreat(AttackType.SYBIL, [nodeId, existingId], [], {
            similarity: this.behaviorSimilarity(fingerprint, existingFingerprint),
            fingerprints: { [nodeId]: fingerprint, [existingId]: existingFingerprint }
          });
        }
      }
      
      behaviorFingerprints.set(nodeId, fingerprint);
    }
  }

  private detectDOSAttacks(): void {
    // Check for abnormal message rates
    const now = Date.now();
    const windowSize = 60000; // 1 minute
    
    for (const [nodeId, limiter] of this.rateLimiters) {
      const recentMessages = limiter.messages.filter(time => now - time < windowSize);
      
      if (recentMessages.length > this.configuration.rateLimiting.maxMessagesPerSecond * 60) {
        this.reportThreat(AttackType.DOS, [nodeId], [], {
          messageRate: recentMessages.length,
          threshold: this.configuration.rateLimiting.maxMessagesPerSecond * 60
        });
      }
    }
  }

  private detectCollusionAttacks(): void {
    // Analyze coordinated behavior patterns
    const recentActivity = new Map<string, number[]>();
    const now = Date.now();
    const windowSize = 300000; // 5 minutes
    
    for (const [nodeId, patterns] of this.behaviorPatterns) {
      const recentTimings = patterns.messageTimings.filter(time => now - time < windowSize);
      recentActivity.set(nodeId, recentTimings);
    }
    
    // Look for synchronized activity
    const nodeIds = Array.from(recentActivity.keys());
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const node1 = nodeIds[i];
        const node2 = nodeIds[j];
        const timings1 = recentActivity.get(node1)!;
        const timings2 = recentActivity.get(node2)!;
        
        const synchronization = this.calculateSynchronization(timings1, timings2);
        if (synchronization > 0.8) {
          this.reportThreat(AttackType.COLLUSION, [node1, node2], [], {
            synchronization,
            timings: { [node1]: timings1, [node2]: timings2 }
          });
        }
      }
    }
  }

  private calculateBehaviorFingerprint(patterns: any): string {
    // Simple fingerprinting based on timing patterns
    const intervals = [];
    for (let i = 1; i < patterns.messageTimings.length && i < 20; i++) {
      intervals.push(patterns.messageTimings[i] - patterns.messageTimings[i - 1]);
    }
    
    if (intervals.length === 0) return '0';
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    
    return `${Math.round(avgInterval)}-${Math.round(variance)}`;
  }

  private behaviorSimilarity(fingerprint1: string, fingerprint2: string): number {
    if (fingerprint1 === fingerprint2) return 1.0;
    
    const [avg1, var1] = fingerprint1.split('-').map(Number);
    const [avg2, var2] = fingerprint2.split('-').map(Number);
    
    const avgSimilarity = 1 - Math.abs(avg1 - avg2) / Math.max(avg1, avg2, 1);
    const varSimilarity = 1 - Math.abs(var1 - var2) / Math.max(var1, var2, 1);
    
    return (avgSimilarity + varSimilarity) / 2;
  }

  private calculateSynchronization(timings1: number[], timings2: number[]): number {
    if (timings1.length === 0 || timings2.length === 0) return 0;
    
    let matches = 0;
    const threshold = 5000; // 5 seconds
    
    for (const timing1 of timings1) {
      for (const timing2 of timings2) {
        if (Math.abs(timing1 - timing2) < threshold) {
          matches++;
          break;
        }
      }
    }
    
    return matches / Math.max(timings1.length, timings2.length);
  }

  private startTrustDecay(): void {
    setInterval(() => {
      this.applyTrustDecay();
    }, 300000); // Every 5 minutes
  }

  private applyTrustDecay(): void {
    const now = Date.now();
    const decayRate = this.configuration.trustDecayRate;
    
    for (const [nodeId, node] of this.nodes) {
      const timeSinceActivity = now - node.lastActivity;
      
      if (timeSinceActivity > 3600000) { // 1 hour of inactivity
        const decayFactor = Math.exp(-decayRate * timeSinceActivity / 3600000);
        node.trustScore *= decayFactor;
        node.reputation *= decayFactor;
      }
    }
  }

  private startNonceCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredNonces();
    }, 60000); // Every minute
  }

  private cleanupExpiredNonces(): void {
    const now = Date.now();
    const maxAge = this.configuration.maxMessageAge;
    
    for (const [nonce, timestamp] of this.nonceWindow) {
      if (now - timestamp > maxAge) {
        this.messageNonces.delete(nonce);
        this.nonceWindow.delete(nonce);
      }
    }
  }

  /**
   * Public API methods
   */

  public getSecurityStatus(): {
    totalNodes: number;
    trustedNodes: number;
    suspiciousNodes: number;
    blacklistedNodes: number;
    threatsActive: number;
    threatsResolved: number;
    averageVerificationTime: number;
  } {
    const trustedNodes = Array.from(this.nodes.values()).filter(node => node.trustScore > 0.7).length;
    const activeThreats = Array.from(this.threats.values()).filter(threat => !threat.resolved).length;
    
    const avgVerificationTime = this.verificationLatency.length > 0
      ? this.verificationLatency.reduce((a, b) => a + b, 0) / this.verificationLatency.length
      : 0;
    
    return {
      totalNodes: this.nodes.size,
      trustedNodes,
      suspiciousNodes: this.suspiciousNodes.size,
      blacklistedNodes: this.blacklistedNodes.size,
      threatsActive: activeThreats,
      threatsResolved: this.threatsResolved,
      averageVerificationTime: avgVerificationTime
    };
  }

  public getNodeSecurityInfo(nodeId: string): {
    trustMetrics: TrustMetrics | null;
    securityEvents: any[];
    isBlacklisted: boolean;
    isSuspicious: boolean;
  } {
    const trustMetrics = this.calculateTrustMetrics(nodeId);
    
    // Get security events for this node
    const securityEvents = Array.from(this.threats.values())
      .filter(threat => 
        threat.sourceNodes.includes(nodeId) || 
        threat.targetNodes.includes(nodeId)
      )
      .map(threat => ({
        threatId: threat.threatId,
        type: threat.type,
        level: threat.level,
        timestamp: threat.timestamp,
        resolved: threat.resolved
      }));
    
    return {
      trustMetrics,
      securityEvents,
      isBlacklisted: this.blacklistedNodes.has(nodeId),
      isSuspicious: this.suspiciousNodes.has(nodeId)
    };
  }

  public getActiveThreats(): ThreatDetection[] {
    return Array.from(this.threats.values()).filter(threat => !threat.resolved);
  }

  public addCertificateAuthority(issuer: string, publicKey: Buffer): void {
    this.certificateAuthorities.set(issuer, publicKey);
    
    this.emit('ca_added', {
      issuer,
      timestamp: Date.now()
    });
  }

  public shutdown(): void {
    this.emit('shutdown', {
      finalMetrics: this.getSecurityStatus(),
      nodeCount: this.nodes.size,
      threatCount: this.threats.size
    });
  }
}

export default SecurityManager;