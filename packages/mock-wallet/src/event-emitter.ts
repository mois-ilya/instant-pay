import { InstantPayEmitter, InstantPayEvent } from '@instant-pay/types';

export class MockEventEmitter implements InstantPayEmitter {
  private listeners: Map<string, ((event: InstantPayEvent) => void)[]> = new Map();

  on<E extends InstantPayEvent['type']>(
    type: E,
    fn: (e: Extract<InstantPayEvent, { type: E }>) => void
  ): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    
    this.listeners.get(type)!.push(fn as any);
    
    // Return unsubscribe function
    return () => this.off(type, fn);
  }

  off<E extends InstantPayEvent['type']>(
    type: E,
    fn: (e: Extract<InstantPayEvent, { type: E }>) => void
  ): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(fn as any);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: InstantPayEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      // Call all listeners synchronously as per spec
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in InstantPay event listener:', error);
        }
      });
    }
  }

  clear(): void {
    this.listeners.clear();
  }

  getListenerCount(type?: string): number {
    if (type) {
      return this.listeners.get(type)?.length || 0;
    }
    return Array.from(this.listeners.values()).reduce((sum, listeners) => sum + listeners.length, 0);
  }
}