/**
 * Event Store for ADK Integration
 * Handles event storage, debugging, batching, and history management
 */

import type {
  IEventStore,
  ADKEvent,
  ADKEventType,
  EventFilter
} from '../types/adk-service';

interface EventSubscription {
  id: string;
  listener: (event: ADKEvent) => void;
  filter?: EventFilter;
}

interface EventBatch {
  id: string;
  events: ADKEvent[];
  timestamp: number;
  processed: boolean;
}

interface EventMetrics {
  totalEvents: number;
  eventsByType: Record<ADKEventType, number>;
  eventsPerSecond: number;
  lastEventTime: number;
  sessionCounts: Record<string, number>;
}

export class EventStore implements IEventStore {
  private events: ADKEvent[] = [];
  private subscriptions = new Map<string, EventSubscription>();
  private eventBatches: EventBatch[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly maxEvents = 10000;
  private readonly maxBatches = 100;
  private readonly batchInterval = 16; // ~60fps
  private readonly maxBatchSize = 10;
  private metrics: EventMetrics;
  private debugMode = false;
  private eventHistory = new Map<string, ADKEvent[]>(); // sessionId -> events

  constructor(options?: { debugMode?: boolean; maxEvents?: number }) {
    this.maxEvents = options?.maxEvents || this.maxEvents;
    this.debugMode = options?.debugMode || false;
    this.metrics = this.initializeMetrics();
    
    if (this.debugMode) {
      this.setupDebugLogging();
    }
  }

  /**
   * Add event to store with batching
   */
  public addEvent(event: ADKEvent): void {
    // Validate event
    if (!this.validateEvent(event)) {
      console.warn('[EventStore] Invalid event received:', event);
      return;
    }

    // Add to store
    this.events.push(event);
    this.updateMetrics(event);

    // Maintain size limit
    if (this.events.length > this.maxEvents) {
      const removed = this.events.splice(0, this.events.length - this.maxEvents);
      this.log(`Removed ${removed.length} old events to maintain limit`);
    }

    // Add to session history
    this.addToSessionHistory(event);

    // Add to current batch
    this.addToBatch(event);

    // Process immediate high-priority events
    if (this.isHighPriorityEvent(event)) {
      this.processEventImmediately(event);
    }

    this.log('Event added:', event.type, event.id);
  }

  /**
   * Get events with optional filtering
   */
  public getEvents(filter?: EventFilter): ADKEvent[] {
    let filteredEvents = [...this.events];

    if (filter) {
      filteredEvents = this.applyFilter(filteredEvents, filter);
    }

    return filteredEvents;
  }

  /**
   * Clear all events
   */
  public clearEvents(): void {
    const eventCount = this.events.length;
    this.events = [];
    this.eventBatches = [];
    this.eventHistory.clear();
    this.metrics = this.initializeMetrics();
    
    this.log(`Cleared ${eventCount} events`);
    this.notifySubscribers({
      id: 'clear_events',
      type: ADKEventType.SYSTEM_EVENTS_CLEARED,
      timestamp: Date.now(),
      sessionId: 'system',
      data: { clearedCount: eventCount }
    } as ADKEvent);
  }

  /**
   * Subscribe to events with optional filtering
   */
  public subscribe(listener: (event: ADKEvent) => void, filter?: EventFilter): () => void {
    const subscriptionId = this.generateSubscriptionId();
    
    const subscription: EventSubscription = {
      id: subscriptionId,
      listener,
      filter
    };

    this.subscriptions.set(subscriptionId, subscription);
    this.log(`Added subscription: ${subscriptionId}`);

    // Return unsubscribe function
    return () => {
      this.subscriptions.delete(subscriptionId);
      this.log(`Removed subscription: ${subscriptionId}`);
    };
  }

  /**
   * Get event history for a specific session
   */
  public getEventHistory(sessionId: string): ADKEvent[] {
    return this.eventHistory.get(sessionId) || [];
  }

  /**
   * Get event metrics and statistics
   */
  public getMetrics(): EventMetrics & { batchCount: number; subscriptionCount: number } {
    return {
      ...this.metrics,
      batchCount: this.eventBatches.length,
      subscriptionCount: this.subscriptions.size
    };
  }

  /**
   * Enable or disable debug mode
   */
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    if (enabled) {
      this.setupDebugLogging();
    }
    this.log(`Debug mode: ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get debug information
   */
  public getDebugInfo() {
    return {
      totalEvents: this.events.length,
      activeBatches: this.eventBatches.filter(b => !b.processed).length,
      subscriptions: this.subscriptions.size,
      sessionHistories: Array.from(this.eventHistory.keys()),
      recentEvents: this.events.slice(-10),
      metrics: this.metrics
    };
  }

  /**
   * Export events for debugging or analysis
   */
  public exportEvents(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      return this.exportAsCSV();
    }
    
    return JSON.stringify({
      exportTime: new Date().toISOString(),
      totalEvents: this.events.length,
      metrics: this.metrics,
      events: this.events
    }, null, 2);
  }

  /**
   * Validate event structure
   */
  private validateEvent(event: ADKEvent): boolean {
    return !!(
      event &&
      event.id &&
      event.type &&
      typeof event.timestamp === 'number' &&
      event.sessionId
    );
  }

  /**
   * Add event to current batch
   */
  private addToBatch(event: ADKEvent): void {
    // Get or create current batch
    let currentBatch = this.eventBatches.find(b => !b.processed);
    
    if (!currentBatch || currentBatch.events.length >= this.maxBatchSize) {
      currentBatch = {
        id: this.generateBatchId(),
        events: [],
        timestamp: Date.now(),
        processed: false
      };
      this.eventBatches.push(currentBatch);
    }

    currentBatch.events.push(event);

    // Schedule batch processing
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatches();
      }, this.batchInterval);
    }

    // Maintain batch limit
    if (this.eventBatches.length > this.maxBatches) {
      this.eventBatches.splice(0, this.eventBatches.length - this.maxBatches);
    }
  }

  /**
   * Process event batches
   */
  private processBatches(): void {
    this.batchTimer = null;
    
    const unprocessedBatches = this.eventBatches.filter(b => !b.processed);
    
    for (const batch of unprocessedBatches) {
      this.processBatch(batch);
      batch.processed = true;
    }

    if (unprocessedBatches.length > 0) {
      this.log(`Processed ${unprocessedBatches.length} event batches`);
    }
  }

  /**
   * Process a single batch
   */
  private processBatch(batch: EventBatch): void {
    // Notify subscribers for each event in batch
    for (const event of batch.events) {
      if (!this.isHighPriorityEvent(event)) {
        this.notifySubscribers(event);
      }
    }
  }

  /**
   * Process high-priority events immediately
   */
  private processEventImmediately(event: ADKEvent): void {
    this.notifySubscribers(event);
  }

  /**
   * Check if event is high priority
   */
  private isHighPriorityEvent(event: ADKEvent): boolean {
    const highPriorityTypes = [
      ADKEventType.ERROR,
      ADKEventType.CONNECTION_CHANGE,
      ADKEventType.SESSION_CREATED
    ];
    
    return highPriorityTypes.includes(event.type);
  }

  /**
   * Notify all relevant subscribers
   */
  private notifySubscribers(event: ADKEvent): void {
    for (const subscription of this.subscriptions.values()) {
      if (this.matchesFilter(event, subscription.filter)) {
        try {
          subscription.listener(event);
        } catch (error) {
          console.error('[EventStore] Subscriber error:', error);
        }
      }
    }
  }

  /**
   * Check if event matches subscription filter
   */
  private matchesFilter(event: ADKEvent, filter?: EventFilter): boolean {
    if (!filter) return true;

    if (filter.type && event.type !== filter.type) return false;
    if (filter.sessionId && event.sessionId !== filter.sessionId) return false;
    if (filter.since && event.timestamp < filter.since.getTime()) return false;

    return true;
  }

  /**
   * Apply filter to events array
   */
  private applyFilter(events: ADKEvent[], filter: EventFilter): ADKEvent[] {
    let filtered = events;

    if (filter.type) {
      filtered = filtered.filter(e => e.type === filter.type);
    }

    if (filter.sessionId) {
      filtered = filtered.filter(e => e.sessionId === filter.sessionId);
    }

    if (filter.since) {
      filtered = filtered.filter(e => e.timestamp >= filter.since!.getTime());
    }

    if (filter.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered;
  }

  /**
   * Add event to session history
   */
  private addToSessionHistory(event: ADKEvent): void {
    const sessionEvents = this.eventHistory.get(event.sessionId) || [];
    sessionEvents.push(event);
    
    // Maintain session history size
    if (sessionEvents.length > 1000) {
      sessionEvents.splice(0, sessionEvents.length - 1000);
    }
    
    this.eventHistory.set(event.sessionId, sessionEvents);
  }

  /**
   * Update metrics
   */
  private updateMetrics(event: ADKEvent): void {
    this.metrics.totalEvents++;
    this.metrics.eventsByType[event.type] = (this.metrics.eventsByType[event.type] || 0) + 1;
    this.metrics.lastEventTime = event.timestamp;
    this.metrics.sessionCounts[event.sessionId] = (this.metrics.sessionCounts[event.sessionId] || 0) + 1;

    // Calculate events per second (approximate)
    const now = Date.now();
    const timeWindow = 10000; // 10 seconds
    const recentEvents = this.events.filter(e => now - e.timestamp < timeWindow);
    this.metrics.eventsPerSecond = recentEvents.length / (timeWindow / 1000);
  }

  /**
   * Initialize metrics object
   */
  private initializeMetrics(): EventMetrics {
    return {
      totalEvents: 0,
      eventsByType: {} as Record<ADKEventType, number>,
      eventsPerSecond: 0,
      lastEventTime: 0,
      sessionCounts: {}
    };
  }

  /**
   * Setup debug logging
   */
  private setupDebugLogging(): void {
    if (typeof window !== 'undefined') {
      (window as any).adkEventStore = {
        getEvents: () => this.events,
        getMetrics: () => this.getMetrics(),
        getDebugInfo: () => this.getDebugInfo(),
        exportEvents: (format?: 'json' | 'csv') => this.exportEvents(format),
        clearEvents: () => this.clearEvents()
      };
      
      console.log('[EventStore] Debug interface available at window.adkEventStore');
    }
  }

  /**
   * Export events as CSV
   */
  private exportAsCSV(): string {
    const headers = ['id', 'type', 'timestamp', 'sessionId', 'data'];
    const rows = this.events.map(event => [
      event.id,
      event.type,
      new Date(event.timestamp).toISOString(),
      event.sessionId,
      JSON.stringify(event.data)
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Generate unique batch ID
   */
  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  }

  /**
   * Log with debug mode check
   */
  private log(...args: any[]): void {
    if (this.debugMode) {
      console.log('[EventStore]', ...args);
    }
  }
}

// Add missing event type
declare module '../types/adk-service' {
  export enum ADKEventType {
    SYSTEM_EVENTS_CLEARED = 'system:events_cleared'
  }
}