/**
 * InstantPay Event Emitter
 * 
 * Type-safe event emitter for InstantPay protocol events.
 * Supports click, sent, and cancelled events with proper TypeScript typing.
 */

import type { Event as IPEvent } from '@tonkeeper/instantpay-protocol';

/**
 * Event listener function type
 */
type EventListener<E extends IPEvent['type']> = (event: Extract<IPEvent, { type: E }>) => void;

/**
 * Unsubscribe function returned by on()
 */
type UnsubscribeFn = () => void;

/**
 * InstantPay Event Emitter interface
 */
export interface InstantPayEmitterInterface {
  on<E extends IPEvent['type']>(
    type: E,
    fn: EventListener<E>
  ): UnsubscribeFn;
  
  off<E extends IPEvent['type']>(
    type: E,
    fn: EventListener<E>
  ): void;
}

/**
 * Type-safe event emitter for InstantPay events
 */
export class InstantPayEmitter implements InstantPayEmitterInterface {
  private _listeners: Map<string, Set<(event: any) => void>> = new Map();

  /**
   * Subscribe to events of a specific type
   * 
   * @param type - Event type to listen for
   * @param fn - Event listener function
   * @returns Unsubscribe function
   */
  on<E extends IPEvent['type']>(
    type: E,
    fn: EventListener<E>
  ): UnsubscribeFn {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, new Set());
    }
    
    const listeners = this._listeners.get(type)!;
    listeners.add(fn as (event: any) => void);
    
    // Return unsubscribe function
    return () => {
      listeners.delete(fn as (event: any) => void);
      if (listeners.size === 0) {
        this._listeners.delete(type);
      }
    };
  }

  /**
   * Unsubscribe from events of a specific type
   * 
   * @param type - Event type
   * @param fn - Event listener function to remove
   */
  off<E extends IPEvent['type']>(
    type: E,
    fn: EventListener<E>
  ): void {
    const listeners = this._listeners.get(type);
    if (listeners) {
      listeners.delete(fn as (event: any) => void);
      if (listeners.size === 0) {
        this._listeners.delete(type);
      }
    }
  }

  /**
   * Emit an event to all registered listeners
   * 
   * @param event - Event to emit
   */
  emit(event: IPEvent): void {
    const listeners = this._listeners.get(event.type);
    if (listeners) {
      // Fire listeners synchronously in the same event loop tick
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error(`[InstantPayEmitter] Error in ${event.type} listener:`, error);
        }
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
  listenerCount(type: IPEvent['type']): number {
    const listeners = this._listeners.get(type);
    return listeners ? listeners.size : 0;
  }

  /**
   * Get all event types that have listeners
   */
  eventNames(): string[] {
    return Array.from(this._listeners.keys());
  }
}