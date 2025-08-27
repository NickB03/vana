/**
 * Raft Consensus Manager
 * 
 * Implements the Raft consensus algorithm for strongly consistent distributed
 * coordination. Provides leader election, log replication, and safety guarantees
 * for trusted node environments.
 */

import { EventEmitter } from 'events';

export enum NodeState {
  FOLLOWER = 'follower',
  CANDIDATE = 'candidate',
  LEADER = 'leader'
}

export enum MessageType {
  REQUEST_VOTE = 'request_vote',
  REQUEST_VOTE_RESPONSE = 'request_vote_response',
  APPEND_ENTRIES = 'append_entries',
  APPEND_ENTRIES_RESPONSE = 'append_entries_response',
  INSTALL_SNAPSHOT = 'install_snapshot',
  INSTALL_SNAPSHOT_RESPONSE = 'install_snapshot_response'
}

export interface LogEntry {
  term: number;
  index: number;
  command: any;
  timestamp: number;
  clientId?: string;
  requestId?: string;
}

export interface RaftNode {
  id: string;
  address: string;
  isOnline: boolean;
  lastContact: number;
  responseTime: number;
}

export interface RaftMessage {
  type: MessageType;
  term: number;
  senderId: string;
  receiverId: string;
  timestamp: number;
  
  // Request Vote specific
  candidateId?: string;
  lastLogIndex?: number;
  lastLogTerm?: number;
  
  // Request Vote Response specific
  voteGranted?: boolean;
  
  // Append Entries specific
  prevLogIndex?: number;
  prevLogTerm?: number;
  entries?: LogEntry[];
  leaderCommit?: number;
  
  // Append Entries Response specific
  success?: boolean;
  matchIndex?: number;
  conflictIndex?: number;
  conflictTerm?: number;
  
  // Install Snapshot specific
  lastIncludedIndex?: number;
  lastIncludedTerm?: number;
  offset?: number;
  data?: Buffer;
  done?: boolean;
}

export interface ClusterConfiguration {
  nodes: RaftNode[];
  heartbeatInterval: number;
  electionTimeoutMin: number;
  electionTimeoutMax: number;
  maxLogEntriesPerAppend: number;
  snapshotThreshold: number;
}

export interface CommitResult {
  success: boolean;
  index: number;
  term: number;
  latency: number;
  error?: string;
}

export class RaftConsensusManager extends EventEmitter {
  // Core Raft state
  private nodeId: string;
  private currentTerm: number = 0;
  private votedFor: string | null = null;
  private state: NodeState = NodeState.FOLLOWER;
  
  // Log state
  private log: LogEntry[] = [];
  private commitIndex: number = 0;
  private lastApplied: number = 0;
  
  // Leader state (reinitialized after election)
  private nextIndex: Map<string, number> = new Map();
  private matchIndex: Map<string, number> = new Map();
  
  // Cluster configuration
  private nodes: Map<string, RaftNode> = new Map();
  private configuration: ClusterConfiguration;
  
  // Timers and intervals
  private electionTimer: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private electionTimeout: number;
  
  // Performance tracking
  private commitLatency: number[] = [];
  private leaderElections: number = 0;
  private logReplicationMetrics = {
    totalReplications: 0,
    successfulReplications: 0,
    averageLatency: 0
  };
  
  // Request tracking for linearizability
  private pendingRequests: Map<string, {
    resolve: (result: CommitResult) => void;
    reject: (error: Error) => void;
    startTime: number;
    clientId: string;
    requestId: string;
  }> = new Map();
  
  // Snapshot state
  private lastIncludedIndex: number = 0;
  private lastIncludedTerm: number = 0;
  private snapshot: Buffer | null = null;

  constructor(nodeId: string, configuration: ClusterConfiguration) {
    super();
    
    this.nodeId = nodeId;
    this.configuration = configuration;
    
    // Initialize cluster nodes
    configuration.nodes.forEach(node => {
      this.nodes.set(node.id, { ...node });
    });
    
    // Initialize election timeout
    this.resetElectionTimeout();
    
    this.emit('initialized', {
      nodeId: this.nodeId,
      clusterSize: this.nodes.size,
      state: this.state,
      term: this.currentTerm
    });
    
    // Start the Raft state machine
    this.startRaft();
  }

  /**
   * Start the Raft consensus algorithm
   */
  private startRaft(): void {
    this.becomeFollower(this.currentTerm);
  }

  /**
   * Submit a command for consensus
   */
  async submitCommand(command: any, clientId: string, requestId: string): Promise<CommitResult> {
    if (this.state !== NodeState.LEADER) {
      return {
        success: false,
        index: -1,
        term: this.currentTerm,
        latency: 0,
        error: 'Not the leader'
      };
    }

    const startTime = Date.now();
    const logEntry: LogEntry = {
      term: this.currentTerm,
      index: this.log.length + 1 + this.lastIncludedIndex,
      command,
      timestamp: startTime,
      clientId,
      requestId
    };

    // Add to log
    this.log.push(logEntry);
    
    // Create promise for this request
    const requestKey = `${clientId}-${requestId}`;
    
    return new Promise<CommitResult>((resolve, reject) => {
      this.pendingRequests.set(requestKey, {
        resolve,
        reject,
        startTime,
        clientId,
        requestId
      });

      // Set timeout for request
      setTimeout(() => {
        if (this.pendingRequests.has(requestKey)) {
          this.pendingRequests.delete(requestKey);
          reject(new Error('Request timeout'));
        }
      }, 10000); // 10 second timeout

      // Start replication
      this.replicateLog();
    });
  }

  /**
   * Process incoming Raft message
   */
  async processMessage(message: RaftMessage): Promise<void> {
    // Update last contact for sender
    const senderNode = this.nodes.get(message.senderId);
    if (senderNode) {
      senderNode.lastContact = Date.now();
    }

    // All messages include term comparison
    if (message.term > this.currentTerm) {
      this.currentTerm = message.term;
      this.votedFor = null;
      this.becomeFollower(message.term);
    }

    switch (message.type) {
      case MessageType.REQUEST_VOTE:
        await this.handleRequestVote(message);
        break;
      case MessageType.REQUEST_VOTE_RESPONSE:
        await this.handleRequestVoteResponse(message);
        break;
      case MessageType.APPEND_ENTRIES:
        await this.handleAppendEntries(message);
        break;
      case MessageType.APPEND_ENTRIES_RESPONSE:
        await this.handleAppendEntriesResponse(message);
        break;
      case MessageType.INSTALL_SNAPSHOT:
        await this.handleInstallSnapshot(message);
        break;
      case MessageType.INSTALL_SNAPSHOT_RESPONSE:
        await this.handleInstallSnapshotResponse(message);
        break;
    }
  }

  /**
   * Handle RequestVote RPC
   */
  private async handleRequestVote(message: RaftMessage): Promise<void> {
    let voteGranted = false;

    if (message.term! < this.currentTerm) {
      // Reply false if term < currentTerm
      voteGranted = false;
    } else if (
      (this.votedFor === null || this.votedFor === message.candidateId) &&
      this.isLogUpToDate(message.lastLogIndex!, message.lastLogTerm!)
    ) {
      // Grant vote if haven't voted or voted for this candidate,
      // and candidate's log is at least as up-to-date as receiver's log
      voteGranted = true;
      this.votedFor = message.candidateId!;
      this.resetElectionTimeout();
    }

    // Send response
    const response: RaftMessage = {
      type: MessageType.REQUEST_VOTE_RESPONSE,
      term: this.currentTerm,
      senderId: this.nodeId,
      receiverId: message.senderId,
      timestamp: Date.now(),
      voteGranted
    };

    await this.sendMessage(response);

    this.emit('vote_requested', {
      candidateId: message.candidateId,
      candidateTerm: message.term,
      voteGranted,
      currentTerm: this.currentTerm
    });
  }

  /**
   * Handle RequestVoteResponse RPC
   */
  private async handleRequestVoteResponse(message: RaftMessage): Promise<void> {
    if (this.state !== NodeState.CANDIDATE || message.term !== this.currentTerm) {
      return; // Ignore if not candidate or stale term
    }

    if (message.voteGranted) {
      const voteCount = this.countVotes();
      const majoritySize = Math.floor(this.nodes.size / 2) + 1;

      if (voteCount >= majoritySize) {
        this.becomeLeader();
      }
    }
  }

  /**
   * Handle AppendEntries RPC
   */
  private async handleAppendEntries(message: RaftMessage): Promise<void> {
    let success = false;
    let matchIndex = 0;
    let conflictIndex = 0;
    let conflictTerm = 0;

    if (message.term! < this.currentTerm) {
      // Reply false if term < currentTerm
      success = false;
    } else {
      // Reset election timeout - valid leader contact
      this.resetElectionTimeout();
      
      if (this.state !== NodeState.FOLLOWER) {
        this.becomeFollower(message.term!);
      }

      // Check log consistency
      if (this.isLogConsistent(message.prevLogIndex!, message.prevLogTerm!)) {
        // Log is consistent, can append entries
        success = true;
        
        if (message.entries && message.entries.length > 0) {
          // Delete any conflicting entries and append new ones
          const insertIndex = message.prevLogIndex! - this.lastIncludedIndex;
          this.log.splice(insertIndex);
          this.log.push(...message.entries);
          
          matchIndex = this.log.length + this.lastIncludedIndex;
        } else {
          matchIndex = message.prevLogIndex!;
        }
        
        // Update commit index
        if (message.leaderCommit! > this.commitIndex) {
          const lastNewEntryIndex = this.log.length + this.lastIncludedIndex;
          this.commitIndex = Math.min(message.leaderCommit!, lastNewEntryIndex);
          
          // Apply committed entries
          await this.applyCommittedEntries();
        }
      } else {
        // Log inconsistency detected
        success = false;
        const conflictInfo = this.findConflictInfo(message.prevLogIndex!);
        conflictIndex = conflictInfo.index;
        conflictTerm = conflictInfo.term;
      }
    }

    // Send response
    const response: RaftMessage = {
      type: MessageType.APPEND_ENTRIES_RESPONSE,
      term: this.currentTerm,
      senderId: this.nodeId,
      receiverId: message.senderId,
      timestamp: Date.now(),
      success,
      matchIndex,
      conflictIndex,
      conflictTerm
    };

    await this.sendMessage(response);

    this.emit('append_entries_received', {
      leaderId: message.senderId,
      term: message.term,
      entriesCount: message.entries?.length || 0,
      success,
      commitIndex: this.commitIndex
    });
  }

  /**
   * Handle AppendEntriesResponse RPC
   */
  private async handleAppendEntriesResponse(message: RaftMessage): Promise<void> {
    if (this.state !== NodeState.LEADER || message.term !== this.currentTerm) {
      return; // Ignore if not leader or stale term
    }

    const followerId = message.senderId;

    if (message.success) {
      // Update nextIndex and matchIndex for follower
      this.nextIndex.set(followerId, message.matchIndex! + 1);
      this.matchIndex.set(followerId, message.matchIndex!);
      
      // Update commit index if majority of followers have replicated
      this.updateCommitIndex();
    } else {
      // Log inconsistency - decrease nextIndex and retry
      if (message.conflictTerm !== undefined && message.conflictIndex !== undefined) {
        // Use conflict optimization
        const conflictIndex = this.findLastEntryWithTerm(message.conflictTerm);
        if (conflictIndex !== -1) {
          this.nextIndex.set(followerId, conflictIndex + 1);
        } else {
          this.nextIndex.set(followerId, message.conflictIndex);
        }
      } else {
        // Fallback to simple decrement
        const currentNext = this.nextIndex.get(followerId) || 1;
        this.nextIndex.set(followerId, Math.max(1, currentNext - 1));
      }
      
      // Retry replication for this follower
      await this.sendAppendEntries(followerId);
    }
  }

  /**
   * Become follower
   */
  private becomeFollower(term: number): void {
    this.currentTerm = term;
    this.state = NodeState.FOLLOWER;
    this.votedFor = null;
    
    // Clear leader state
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Start election timeout
    this.resetElectionTimeout();
    
    this.emit('state_changed', {
      state: NodeState.FOLLOWER,
      term: this.currentTerm
    });
  }

  /**
   * Become candidate and start election
   */
  private becomeCandidate(): void {
    this.currentTerm++;
    this.state = NodeState.CANDIDATE;
    this.votedFor = this.nodeId;
    
    this.leaderElections++;
    
    // Reset election timeout
    this.resetElectionTimeout();
    
    this.emit('state_changed', {
      state: NodeState.CANDIDATE,
      term: this.currentTerm
    });
    
    // Start election
    this.startElection();
  }

  /**
   * Become leader
   */
  private becomeLeader(): void {
    this.state = NodeState.LEADER;
    
    // Stop election timeout
    if (this.electionTimer) {
      clearTimeout(this.electionTimer);
      this.electionTimer = null;
    }
    
    // Initialize leader state
    this.initializeLeaderState();
    
    // Start sending heartbeats
    this.startHeartbeats();
    
    this.emit('state_changed', {
      state: NodeState.LEADER,
      term: this.currentTerm
    });
    
    this.emit('leader_elected', {
      leaderId: this.nodeId,
      term: this.currentTerm
    });
  }

  /**
   * Start election process
   */
  private async startElection(): Promise<void> {
    // Request votes from all other nodes
    const lastLogIndex = this.log.length + this.lastIncludedIndex;
    const lastLogTerm = this.log.length > 0 ? this.log[this.log.length - 1].term : this.lastIncludedTerm;
    
    const requestVoteMessage: RaftMessage = {
      type: MessageType.REQUEST_VOTE,
      term: this.currentTerm,
      senderId: this.nodeId,
      receiverId: '', // Will be set per recipient
      timestamp: Date.now(),
      candidateId: this.nodeId,
      lastLogIndex,
      lastLogTerm
    };

    // Send to all other nodes
    const otherNodes = Array.from(this.nodes.keys()).filter(id => id !== this.nodeId);
    
    for (const nodeId of otherNodes) {
      const message = { ...requestVoteMessage, receiverId: nodeId };
      await this.sendMessage(message);
    }

    this.emit('election_started', {
      candidateId: this.nodeId,
      term: this.currentTerm,
      targetNodes: otherNodes.length
    });
  }

  /**
   * Initialize leader state
   */
  private initializeLeaderState(): void {
    const nextIndex = this.log.length + this.lastIncludedIndex + 1;
    
    this.nodes.forEach((_, nodeId) => {
      if (nodeId !== this.nodeId) {
        this.nextIndex.set(nodeId, nextIndex);
        this.matchIndex.set(nodeId, 0);
      }
    });
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeats(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeats();
    }, this.configuration.heartbeatInterval);
  }

  /**
   * Send heartbeats to all followers
   */
  private async sendHeartbeats(): Promise<void> {
    if (this.state !== NodeState.LEADER) return;

    const otherNodes = Array.from(this.nodes.keys()).filter(id => id !== this.nodeId);
    
    for (const nodeId of otherNodes) {
      await this.sendAppendEntries(nodeId);
    }
  }

  /**
   * Send AppendEntries RPC to specific follower
   */
  private async sendAppendEntries(followerId: string): Promise<void> {
    const nextIndex = this.nextIndex.get(followerId) || 1;
    const prevLogIndex = nextIndex - 1;
    
    let prevLogTerm = 0;
    if (prevLogIndex === this.lastIncludedIndex) {
      prevLogTerm = this.lastIncludedTerm;
    } else if (prevLogIndex > this.lastIncludedIndex) {
      const logIndex = prevLogIndex - this.lastIncludedIndex - 1;
      prevLogTerm = this.log[logIndex]?.term || 0;
    }

    // Determine entries to send
    const startIndex = nextIndex - this.lastIncludedIndex - 1;
    const maxEntries = this.configuration.maxLogEntriesPerAppend;
    const entries = this.log.slice(startIndex, startIndex + maxEntries);

    const message: RaftMessage = {
      type: MessageType.APPEND_ENTRIES,
      term: this.currentTerm,
      senderId: this.nodeId,
      receiverId: followerId,
      timestamp: Date.now(),
      prevLogIndex,
      prevLogTerm,
      entries,
      leaderCommit: this.commitIndex
    };

    await this.sendMessage(message);
  }

  /**
   * Replicate log to all followers
   */
  private async replicateLog(): Promise<void> {
    if (this.state !== NodeState.LEADER) return;

    const otherNodes = Array.from(this.nodes.keys()).filter(id => id !== this.nodeId);
    
    for (const nodeId of otherNodes) {
      await this.sendAppendEntries(nodeId);
    }
  }

  /**
   * Update commit index based on majority replication
   */
  private updateCommitIndex(): void {
    if (this.state !== NodeState.LEADER) return;

    // Find the highest index replicated on majority of servers
    const matchIndices = Array.from(this.matchIndex.values());
    matchIndices.push(this.log.length + this.lastIncludedIndex); // Include leader's own log
    
    matchIndices.sort((a, b) => b - a); // Sort descending
    const majorityIndex = Math.floor(matchIndices.length / 2);
    const newCommitIndex = matchIndices[majorityIndex];

    // Only commit entries from current term
    if (newCommitIndex > this.commitIndex) {
      const entryIndex = newCommitIndex - this.lastIncludedIndex - 1;
      if (entryIndex >= 0 && entryIndex < this.log.length) {
        const entry = this.log[entryIndex];
        if (entry.term === this.currentTerm) {
          this.commitIndex = newCommitIndex;
          this.applyCommittedEntries();
        }
      }
    }
  }

  /**
   * Apply committed entries to state machine
   */
  private async applyCommittedEntries(): Promise<void> {
    while (this.lastApplied < this.commitIndex) {
      this.lastApplied++;
      const entryIndex = this.lastApplied - this.lastIncludedIndex - 1;
      
      if (entryIndex >= 0 && entryIndex < this.log.length) {
        const entry = this.log[entryIndex];
        
        // Apply to state machine
        this.emit('entry_applied', {
          index: entry.index,
          term: entry.term,
          command: entry.command,
          clientId: entry.clientId,
          requestId: entry.requestId
        });

        // Resolve pending request if it exists
        if (entry.clientId && entry.requestId) {
          const requestKey = `${entry.clientId}-${entry.requestId}`;
          const pendingRequest = this.pendingRequests.get(requestKey);
          
          if (pendingRequest) {
            const latency = Date.now() - pendingRequest.startTime;
            this.commitLatency.push(latency);
            
            pendingRequest.resolve({
              success: true,
              index: entry.index,
              term: entry.term,
              latency
            });
            
            this.pendingRequests.delete(requestKey);
          }
        }
      }
    }
  }

  /**
   * Utility methods
   */
  private isLogUpToDate(lastLogIndex: number, lastLogTerm: number): boolean {
    const myLastIndex = this.log.length + this.lastIncludedIndex;
    const myLastTerm = this.log.length > 0 ? this.log[this.log.length - 1].term : this.lastIncludedTerm;
    
    if (lastLogTerm !== myLastTerm) {
      return lastLogTerm > myLastTerm;
    }
    return lastLogIndex >= myLastIndex;
  }

  private isLogConsistent(prevLogIndex: number, prevLogTerm: number): boolean {
    if (prevLogIndex > this.log.length + this.lastIncludedIndex) {
      return false; // Log is too short
    }
    
    if (prevLogIndex === this.lastIncludedIndex) {
      return prevLogTerm === this.lastIncludedTerm;
    }
    
    if (prevLogIndex < this.lastIncludedIndex) {
      return false; // Entry is in snapshot
    }
    
    const entryIndex = prevLogIndex - this.lastIncludedIndex - 1;
    if (entryIndex >= 0 && entryIndex < this.log.length) {
      return this.log[entryIndex].term === prevLogTerm;
    }
    
    return prevLogIndex === 0; // Empty log case
  }

  private findConflictInfo(conflictIndex: number): { index: number; term: number } {
    if (conflictIndex <= this.lastIncludedIndex) {
      return { index: this.lastIncludedIndex + 1, term: this.lastIncludedTerm };
    }
    
    const entryIndex = conflictIndex - this.lastIncludedIndex - 1;
    if (entryIndex < this.log.length) {
      const conflictTerm = this.log[entryIndex].term;
      // Find first entry with this term
      let firstIndex = entryIndex;
      while (firstIndex > 0 && this.log[firstIndex - 1].term === conflictTerm) {
        firstIndex--;
      }
      return { index: firstIndex + this.lastIncludedIndex + 1, term: conflictTerm };
    }
    
    return { index: this.log.length + this.lastIncludedIndex + 1, term: 0 };
  }

  private findLastEntryWithTerm(term: number): number {
    for (let i = this.log.length - 1; i >= 0; i--) {
      if (this.log[i].term === term) {
        return i + this.lastIncludedIndex + 1;
      }
    }
    return -1;
  }

  private countVotes(): number {
    // Count own vote plus any received votes
    // This would need to be tracked during election
    return 1; // Simplified - implement proper vote counting
  }

  private resetElectionTimeout(): void {
    if (this.electionTimer) {
      clearTimeout(this.electionTimer);
    }
    
    // Random timeout between min and max
    this.electionTimeout = Math.random() * 
      (this.configuration.electionTimeoutMax - this.configuration.electionTimeoutMin) +
      this.configuration.electionTimeoutMin;
    
    this.electionTimer = setTimeout(() => {
      if (this.state !== NodeState.LEADER) {
        this.becomeCandidate();
      }
    }, this.electionTimeout);
  }

  private async sendMessage(message: RaftMessage): Promise<void> {
    // Emit message for network layer to handle
    this.emit('send_message', message);
  }

  /**
   * Snapshot handling
   */
  private async handleInstallSnapshot(message: RaftMessage): Promise<void> {
    // Simplified snapshot installation
    if (message.term! < this.currentTerm) {
      return;
    }

    this.resetElectionTimeout();

    if (message.lastIncludedIndex! <= this.commitIndex) {
      // Snapshot is outdated
      return;
    }

    // Install snapshot
    this.lastIncludedIndex = message.lastIncludedIndex!;
    this.lastIncludedTerm = message.lastIncludedTerm!;
    this.snapshot = message.data!;
    
    // Discard log entries covered by snapshot
    this.log = [];
    this.commitIndex = message.lastIncludedIndex!;
    this.lastApplied = message.lastIncludedIndex!;

    this.emit('snapshot_installed', {
      lastIncludedIndex: this.lastIncludedIndex,
      lastIncludedTerm: this.lastIncludedTerm
    });
  }

  private async handleInstallSnapshotResponse(message: RaftMessage): Promise<void> {
    if (this.state !== NodeState.LEADER || message.term !== this.currentTerm) {
      return;
    }

    // Update follower state after successful snapshot installation
    const followerId = message.senderId;
    this.nextIndex.set(followerId, this.lastIncludedIndex + 1);
    this.matchIndex.set(followerId, this.lastIncludedIndex);
  }

  /**
   * Public API methods
   */

  public getCurrentState(): {
    state: NodeState;
    term: number;
    commitIndex: number;
    lastApplied: number;
    logLength: number;
    isLeader: boolean;
  } {
    return {
      state: this.state,
      term: this.currentTerm,
      commitIndex: this.commitIndex,
      lastApplied: this.lastApplied,
      logLength: this.log.length,
      isLeader: this.state === NodeState.LEADER
    };
  }

  public getPerformanceMetrics(): {
    averageCommitLatency: number;
    leaderElections: number;
    logReplicationSuccessRate: number;
    clusterHealth: number;
  } {
    const avgLatency = this.commitLatency.length > 0
      ? this.commitLatency.reduce((a, b) => a + b, 0) / this.commitLatency.length
      : 0;

    const replicationSuccessRate = this.logReplicationMetrics.totalReplications > 0
      ? this.logReplicationMetrics.successfulReplications / this.logReplicationMetrics.totalReplications
      : 0;

    const onlineNodes = Array.from(this.nodes.values()).filter(n => n.isOnline).length;
    const clusterHealth = onlineNodes / this.nodes.size;

    return {
      averageCommitLatency: avgLatency,
      leaderElections: this.leaderElections,
      logReplicationSuccessRate: replicationSuccessRate,
      clusterHealth
    };
  }

  public getClusterStatus(): {
    leaderId: string | null;
    term: number;
    nodes: { id: string; state: string; lastContact: number; isOnline: boolean }[];
    commitIndex: number;
    logLength: number;
  } {
    const leaderId = this.state === NodeState.LEADER ? this.nodeId : null;
    
    const nodesStatus = Array.from(this.nodes.entries()).map(([id, node]) => ({
      id,
      state: id === this.nodeId ? this.state : 'unknown',
      lastContact: node.lastContact,
      isOnline: node.isOnline
    }));

    return {
      leaderId,
      term: this.currentTerm,
      nodes: nodesStatus,
      commitIndex: this.commitIndex,
      logLength: this.log.length
    };
  }

  /**
   * Cleanup and shutdown
   */
  public shutdown(): void {
    if (this.electionTimer) {
      clearTimeout(this.electionTimer);
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Reject all pending requests
    this.pendingRequests.forEach((request) => {
      request.reject(new Error('Node shutting down'));
    });
    this.pendingRequests.clear();

    this.emit('shutdown', {
      nodeId: this.nodeId,
      finalTerm: this.currentTerm,
      finalState: this.state
    });
  }
}

export default RaftConsensusManager;