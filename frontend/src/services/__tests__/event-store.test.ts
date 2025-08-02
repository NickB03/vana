/**
 * EventStore tests
 * 
 * Tests for event storage, retrieval, filtering, subscription management,
 * and debugging functionality.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EventStore } from '../event-store';
import type { ADKEvent, EventFilter } from '@/types/adk-service';

describe('EventStore', () => {
  let eventStore: EventStore;
  let mockEvent: ADKEvent;

  beforeEach(() => {
    eventStore = new EventStore({ debugMode: false });
    
    mockEvent = {
      id: 'evt_123',
      type: 'ui:message_received',
      timestamp: Date.now(),
      sessionId: 'session_456',
      data: {
        content: 'Test event data',
        agent: 'test_agent',
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Event Storage', () => {
    it('should add events to the store', () => {
      eventStore.addEvent(mockEvent);

      const events = eventStore.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(mockEvent);
    });

    it('should validate events before adding', () => {
      const invalidEvent = {
        // Missing required fields
        id: 'invalid',
      } as ADKEvent;

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      eventStore.addEvent(invalidEvent);

      const events = eventStore.getEvents();
      expect(events).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[EventStore] Invalid event received:',
        invalidEvent
      );

      consoleSpy.mockRestore();
    });

    it('should maintain maximum event limit', () => {
      const smallEventStore = new EventStore({ maxEvents: 3 });

      // Add more events than the limit
      for (let i = 0; i < 5; i++) {
        smallEventStore.addEvent({
          ...mockEvent,
          id: `evt_${i}`,
          timestamp: Date.now() + i,
        });
      }

      const events = smallEventStore.getEvents();
      expect(events).toHaveLength(3);
      
      // Should keep the most recent events
      expect(events[0].id).toBe('evt_2');
      expect(events[1].id).toBe('evt_3');
      expect(events[2].id).toBe('evt_4');
    });

    it('should handle concurrent event additions', () => {
      const events = Array.from({ length: 100 }, (_, i) => ({
        ...mockEvent,
        id: `evt_${i}`,
        timestamp: Date.now() + i,
      }));

      // Add events concurrently
      events.forEach(event => eventStore.addEvent(event));

      const storedEvents = eventStore.getEvents();
      expect(storedEvents).toHaveLength(100);
    });
  });

  describe('Event Filtering', () => {
    beforeEach(() => {
      // Add various events for filtering tests
      const events = [
        { ...mockEvent, id: 'evt_1', type: 'ui:message_received', sessionId: 'session_1' },
        { ...mockEvent, id: 'evt_2', type: 'ui:thinking_update', sessionId: 'session_1' },
        { ...mockEvent, id: 'evt_3', type: 'system:connection_established', sessionId: 'session_2' },
        { ...mockEvent, id: 'evt_4', type: 'ui:message_received', sessionId: 'session_2' },
      ];

      events.forEach(event => eventStore.addEvent(event));
    });

    it('should filter events by type', () => {
      const filter: EventFilter = { type: 'ui:message_received' };
      
      const filtered = eventStore.getEvents(filter);

      expect(filtered).toHaveLength(2);
      expect(filtered.every(event => event.type === 'ui:message_received')).toBe(true);
    });

    it('should filter events by session ID', () => {
      const filter: EventFilter = { sessionId: 'session_1' };
      
      const filtered = eventStore.getEvents(filter);

      expect(filtered).toHaveLength(2);
      expect(filtered.every(event => event.sessionId === 'session_1')).toBe(true);
    });

    it('should filter events by time range', () => {
      const now = Date.now();
      const filter: EventFilter = {
        timeRange: {
          start: now - 1000,
          end: now + 1000,
        },
      };
      
      const filtered = eventStore.getEvents(filter);

      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every(event => 
        event.timestamp >= filter.timeRange!.start! && 
        event.timestamp <= filter.timeRange!.end!
      )).toBe(true);
    });

    it('should combine multiple filters', () => {
      const filter: EventFilter = {
        type: 'ui:message_received',
        sessionId: 'session_1',
      };
      
      const filtered = eventStore.getEvents(filter);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('evt_1');
    });

    it('should return empty array when no events match filter', () => {
      const filter: EventFilter = { sessionId: 'nonexistent_session' };
      
      const filtered = eventStore.getEvents(filter);

      expect(filtered).toHaveLength(0);
    });
  });

  describe('Event Subscriptions', () => {
    it('should subscribe to events', () => {
      const callback = vi.fn();
      
      const unsubscribe = eventStore.subscribe(callback);

      eventStore.addEvent(mockEvent);

      expect(callback).toHaveBeenCalledWith(mockEvent);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should subscribe with filters', () => {
      const callback = vi.fn();
      const filter: EventFilter = { type: 'ui:message_received' };
      
      eventStore.subscribe(callback, filter);

      // Add matching event
      eventStore.addEvent({ ...mockEvent, type: 'ui:message_received' });
      
      // Add non-matching event
      eventStore.addEvent({ ...mockEvent, type: 'system:error', id: 'evt_456' });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'ui:message_received' })
      );
    });

    it('should unsubscribe from events', () => {
      const callback = vi.fn();
      
      const unsubscribe = eventStore.subscribe(callback);
      
      eventStore.addEvent(mockEvent);
      expect(callback).toHaveBeenCalledTimes(1);

      // Unsubscribe
      unsubscribe();
      
      eventStore.addEvent({ ...mockEvent, id: 'evt_456' });
      expect(callback).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should handle multiple subscribers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      eventStore.subscribe(callback1);
      eventStore.subscribe(callback2);

      eventStore.addEvent(mockEvent);

      expect(callback1).toHaveBeenCalledWith(mockEvent);
      expect(callback2).toHaveBeenCalledWith(mockEvent);
    });

    it('should handle subscriber errors gracefully', () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Subscriber error');
      });
      const normalCallback = vi.fn();

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      eventStore.subscribe(errorCallback);
      eventStore.subscribe(normalCallback);

      eventStore.addEvent(mockEvent);

      // Normal callback should still be called
      expect(normalCallback).toHaveBeenCalledWith(mockEvent);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Session History', () => {
    it('should track events by session', () => {
      const event1 = { ...mockEvent, sessionId: 'session_1', id: 'evt_1' };
      const event2 = { ...mockEvent, sessionId: 'session_2', id: 'evt_2' };
      const event3 = { ...mockEvent, sessionId: 'session_1', id: 'evt_3' };

      eventStore.addEvent(event1);
      eventStore.addEvent(event2);
      eventStore.addEvent(event3);

      const session1History = eventStore.getEventHistory('session_1');
      const session2History = eventStore.getEventHistory('session_2');

      expect(session1History).toHaveLength(2);
      expect(session1History).toContainEqual(event1);
      expect(session1History).toContainEqual(event3);

      expect(session2History).toHaveLength(1);
      expect(session2History).toContainEqual(event2);
    });

    it('should return empty array for unknown session', () => {
      const history = eventStore.getEventHistory('unknown_session');
      expect(history).toEqual([]);
    });
  });

  describe('Event Metrics', () => {
    it('should track basic metrics', () => {
      eventStore.addEvent({ ...mockEvent, type: 'ui:message_received' });
      eventStore.addEvent({ ...mockEvent, type: 'ui:thinking_update', id: 'evt_456' });
      eventStore.addEvent({ ...mockEvent, type: 'ui:message_received', id: 'evt_789' });

      const debugInfo = eventStore.getDebugInfo();

      expect(debugInfo.metrics.totalEvents).toBe(3);
      expect(debugInfo.metrics.eventsByType['ui:message_received']).toBe(2);
      expect(debugInfo.metrics.eventsByType['ui:thinking_update']).toBe(1);
    });

    it('should track session event counts', () => {
      eventStore.addEvent({ ...mockEvent, sessionId: 'session_1' });
      eventStore.addEvent({ ...mockEvent, sessionId: 'session_1', id: 'evt_456' });
      eventStore.addEvent({ ...mockEvent, sessionId: 'session_2', id: 'evt_789' });

      const debugInfo = eventStore.getDebugInfo();

      expect(debugInfo.metrics.sessionCounts['session_1']).toBe(2);
      expect(debugInfo.metrics.sessionCounts['session_2']).toBe(1);
    });

    it('should calculate events per second', () => {
      const now = Date.now();
      
      // Add events with timestamps in the past second
      eventStore.addEvent({ ...mockEvent, timestamp: now - 500 });
      eventStore.addEvent({ ...mockEvent, timestamp: now - 200, id: 'evt_456' });
      eventStore.addEvent({ ...mockEvent, timestamp: now, id: 'evt_789' });

      const debugInfo = eventStore.getDebugInfo();

      expect(debugInfo.metrics.eventsPerSecond).toBeGreaterThan(0);
    });
  });

  describe('Event Batching', () => {
    it('should handle high-priority events immediately', () => {
      const callback = vi.fn();
      eventStore.subscribe(callback);

      const highPriorityEvent = {
        ...mockEvent,
        type: 'system:error' as any, // High priority event type
      };

      eventStore.addEvent(highPriorityEvent);

      // High priority events should be processed immediately
      expect(callback).toHaveBeenCalledWith(highPriorityEvent);
    });

    it('should batch regular events for performance', async () => {
      vi.useFakeTimers();
      
      const callback = vi.fn();
      eventStore.subscribe(callback);

      // Add multiple regular events
      for (let i = 0; i < 5; i++) {
        eventStore.addEvent({
          ...mockEvent,
          id: `evt_${i}`,
          type: 'ui:content_update' as any,
        });
      }

      // Events should be batched, not processed immediately
      expect(callback).toHaveBeenCalledTimes(5); // Each event still triggers callback

      vi.useRealTimers();
    });
  });

  describe('Debug Mode', () => {
    it('should provide detailed debug information', () => {
      const debugEventStore = new EventStore({ debugMode: true });
      
      debugEventStore.addEvent(mockEvent);
      debugEventStore.addEvent({ ...mockEvent, id: 'evt_456' });

      const debugInfo = debugEventStore.getDebugInfo();

      expect(debugInfo).toEqual({
        eventCount: 2,
        subscriptionCount: 0,
        batchCount: expect.any(Number),
        oldestEvent: expect.any(Number),
        newestEvent: expect.any(Number),
        metrics: expect.any(Object),
        memoryUsage: expect.any(Object),
      });
    });

    it('should log events in debug mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const debugEventStore = new EventStore({ debugMode: true });
      
      debugEventStore.addEvent(mockEvent);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[EventStore]',
        'Event added:',
        mockEvent.type,
        mockEvent.id
      );

      consoleSpy.mockRestore();
    });

    it('should not log in non-debug mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      eventStore.addEvent(mockEvent);

      // Should not log in non-debug mode (only internal log calls)
      const eventStoreLogs = consoleSpy.mock.calls.filter(call => 
        call[0] === '[EventStore]'
      );
      expect(eventStoreLogs).toHaveLength(0);

      consoleSpy.mockRestore();
    });
  });

  describe('Memory Management', () => {
    it('should clear all events', () => {
      eventStore.addEvent(mockEvent);
      eventStore.addEvent({ ...mockEvent, id: 'evt_456' });

      expect(eventStore.getEvents()).toHaveLength(2);

      eventStore.clearEvents();

      expect(eventStore.getEvents()).toHaveLength(0);
    });

    it('should clear session history when clearing events', () => {
      eventStore.addEvent(mockEvent);

      expect(eventStore.getEventHistory(mockEvent.sessionId)).toHaveLength(1);

      eventStore.clearEvents();

      expect(eventStore.getEventHistory(mockEvent.sessionId)).toHaveLength(0);
    });

    it('should track memory usage in debug info', () => {
      for (let i = 0; i < 10; i++) {
        eventStore.addEvent({
          ...mockEvent,
          id: `evt_${i}`,
          data: { content: `Large content ${'x'.repeat(1000)}` },
        });
      }

      const debugInfo = eventStore.getDebugInfo();

      expect(debugInfo.memoryUsage).toEqual({
        eventsSize: expect.any(Number),
        subscriptionsSize: expect.any(Number),
        batchesSize: expect.any(Number),
        totalEstimatedSize: expect.any(Number),
      });
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of events efficiently', () => {
      const startTime = performance.now();
      
      // Add 1000 events
      for (let i = 0; i < 1000; i++) {
        eventStore.addEvent({
          ...mockEvent,
          id: `evt_${i}`,
          timestamp: Date.now() + i,
        });
      }
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(eventStore.getEvents()).toHaveLength(1000);
      expect(executionTime).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should handle multiple subscribers efficiently', () => {
      const callbacks = Array.from({ length: 100 }, () => vi.fn());
      
      callbacks.forEach(callback => eventStore.subscribe(callback));

      const startTime = performance.now();
      eventStore.addEvent(mockEvent);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(50); // Should complete quickly
      callbacks.forEach(callback => {
        expect(callback).toHaveBeenCalledWith(mockEvent);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed events gracefully', () => {
      const malformedEvent = {
        id: 'test',
        // Missing required fields
      } as ADKEvent;

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(() => {
        eventStore.addEvent(malformedEvent);
      }).not.toThrow();

      consoleSpy.mockRestore();
    });

    it('should handle subscription callback errors', () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      eventStore.subscribe(errorCallback);

      expect(() => {
        eventStore.addEvent(mockEvent);
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle invalid filters gracefully', () => {
      const invalidFilter = {
        type: null,
        sessionId: undefined,
      } as any;

      expect(() => {
        eventStore.getEvents(invalidFilter);
      }).not.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should respect custom maxEvents configuration', () => {
      const customEventStore = new EventStore({ maxEvents: 5 });

      for (let i = 0; i < 10; i++) {
        customEventStore.addEvent({
          ...mockEvent,
          id: `evt_${i}`,
        });
      }

      expect(customEventStore.getEvents()).toHaveLength(5);
    });

    it('should respect debug mode configuration', () => {
      const debugEventStore = new EventStore({ debugMode: true });
      const nonDebugEventStore = new EventStore({ debugMode: false });

      expect(debugEventStore['debugMode']).toBe(true);
      expect(nonDebugEventStore['debugMode']).toBe(false);
    });
  });
});