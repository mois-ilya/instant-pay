/**
 * InstantPay Event Emitter
 * 
 * Type-safe event emitter for InstantPay protocol events.
 * Supports ready, click, sent, cancelled, handoff with proper TypeScript typing.
 */

import type { InstantPayEvent } from '@tonkeeper/instantpay-protocol';

/**
 * Event listener function type
 */
type EventListener<E extends InstantPayEvent['type']> = (
  event: Extract<InstantPayEvent, { type: E }>
) => void;

/**
 * Unsubscribe function returned by on()
 */
type UnsubscribeFn = () => void;

/**
 * InstantPay Event Emitter interface
 */
export interface InstantPayEventEmitter {
  on<E extends InstantPayEvent['type']>(
    type: E,
    fn: EventListener<E>
  ): UnsubscribeFn;
  
  off<E extends InstantPayEvent['type']>(
    type: E,
    fn: EventListener<E>
  ): void;

  once<E extends InstantPayEvent['type']>(
    type: E,
    fn: EventListener<E>
  ): UnsubscribeFn;
}

/**
 * Type-safe event emitter for InstantPay events
 */
type InternalListener = (event: InstantPayEvent) => void;
type ListenerKey = (event: InstantPayEvent) => void;

export class InstantPayEmitter implements InstantPayEventEmitter {
  // Map event type -> (original listener -> wrapped listener)
  private _listeners: Map<InstantPayEvent['type'], Map<ListenerKey, InternalListener>> = new Map();

  /**
   * Subscribe to events of a specific type
   * 
   * @param type - Event type to listen for
   * @param fn - Event listener function
   * @returns Unsubscribe function
   */
  on<E extends InstantPayEvent['type']>(type: E, fn: EventListener<E>): UnsubscribeFn {
    let bucket = this._listeners.get(type);
    if (!bucket) {
      bucket = new Map();
      this._listeners.set(type, bucket);
    }

    const wrapped: InternalListener = (event) => {
      // Safe due to discriminated union on 'type'
      fn(event as Extract<InstantPayEvent, { type: E }>);
    };
    const key = fn as unknown as ListenerKey;
    bucket.set(key, wrapped);
    return () => this.off(type, fn);
  }

  /**
   * Unsubscribe from events of a specific type
   * 
   * @param type - Event type
   * @param fn - Event listener function to remove
   */
  off<E extends InstantPayEvent['type']>(type: E, fn: EventListener<E>): void {
    const bucket = this._listeners.get(type);
    if (!bucket) return;
    const key = fn as unknown as ListenerKey;
    if (bucket.has(key)) {
      bucket.delete(key);
      if (bucket.size === 0) this._listeners.delete(type);
    }
  }

  /**
   * Subscribe to a single event occurrence, then auto-unsubscribe
   */
  once<E extends InstantPayEvent['type']>(type: E, fn: EventListener<E>): UnsubscribeFn {
    const onceWrapper: EventListener<E> = (event) => {
      try { fn(event); } finally { this.off(type, onceWrapper); }
    };
    return this.on(type, onceWrapper);
  }

  /**
   * Emit an event to all registered listeners
   * 
   * @param event - Event to emit
   */
  emit(event: InstantPayEvent): void {
    const bucket = this._listeners.get(event.type);
    if (!bucket) return;
    for (const wrapped of bucket.values()) {
      try {
        wrapped(event);
      } catch (error) {
        console.error(`[InstantPayEmitter] Error in ${event.type} listener:`, error);
      }
    }
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this._listeners.clear();
  }

  /**
   * Get the number of listeners for a specific event type
   */
  listenerCount(type: InstantPayEvent['type']): number {
    const bucket = this._listeners.get(type);
    return bucket ? bucket.size : 0;
  }

  /**
   * Get all event types that have listeners
   */
  eventNames(): InstantPayEvent['type'][] {
    return Array.from(this._listeners.keys());
  }
}