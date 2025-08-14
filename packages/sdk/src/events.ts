/**
 * InstantPay Event Emitter
 * 
 * Type-safe event emitter for InstantPay events.
 * Protocol-level: show, click, sent, cancelled.
 * SDK-level: inited (SDK-only, not part of protocol schemas).
 */

import type { Handshake, InstantPayEvent as ProtocolEvent, InstantPayEventEmitter } from '@tonkeeper/instantpay-protocol';

/**
 * SDK-visible event union: protocol events + SDK-only 'inited'
 */
export type SDKEvent = ProtocolEvent | { type: 'inited'; injected: boolean; handshake?: Handshake };

/**
 * Event listener function type
 */
type EventListener<E extends SDKEvent['type']> = (
  event: Extract<SDKEvent, { type: E }>
) => void;

/**
 * Unsubscribe function returned by on()
 */
type UnsubscribeFn = () => void;

// Interface InstantPayEventEmitter is provided by protocol

/**
 * Type-safe event emitter for InstantPay events
 */
type InternalListener = (event: SDKEvent) => void;
type ListenerKey = (event: SDKEvent) => void;

export class InstantPayEmitter implements InstantPayEventEmitter {
  // Map event type -> (original listener -> wrapped listener)
  private _listeners: Map<SDKEvent['type'], Map<ListenerKey, InternalListener>> = new Map();

  /**
   * Subscribe to events of a specific type
   * 
   * @param type - Event type to listen for
   * @param fn - Event listener function
   * @returns Unsubscribe function
   */
  on<E extends SDKEvent['type']>(type: E, fn: EventListener<E>): UnsubscribeFn {
    let bucket = this._listeners.get(type);
    if (!bucket) {
      bucket = new Map();
      this._listeners.set(type, bucket);
    }

    const wrapped: InternalListener = (event) => {
      // Safe due to discriminated union on 'type'
      fn(event as Extract<SDKEvent, { type: E }>);
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
  off<E extends SDKEvent['type']>(type: E, fn: EventListener<E>): void {
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
  once<E extends SDKEvent['type']>(type: E, fn: EventListener<E>): UnsubscribeFn {
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
  emit(event: SDKEvent): void {
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
  listenerCount(type: SDKEvent['type']): number {
    const bucket = this._listeners.get(type);
    return bucket ? bucket.size : 0;
  }

  /**
   * Get all event types that have listeners
   */
  eventNames(): SDKEvent['type'][] {
    return Array.from(this._listeners.keys());
  }
}