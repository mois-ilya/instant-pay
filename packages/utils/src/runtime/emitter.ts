import type { InstantPayEvent, InstantPayEventEmitter } from '@tonkeeper/instantpay-protocol';

type EventListener<E extends InstantPayEvent['type']> = (
  event: Extract<InstantPayEvent, { type: E }>
) => void;

type InternalListener = (event: InstantPayEvent) => void;
type ListenerKey = (event: InstantPayEvent) => void;

export class ProtocolEventEmitter implements InstantPayEventEmitter {
  private _listeners: Map<InstantPayEvent['type'], Map<ListenerKey, InternalListener>> = new Map();

  on<E extends InstantPayEvent['type']>(type: E, fn: EventListener<E>): () => void {
    let bucket = this._listeners.get(type);
    if (!bucket) {
      bucket = new Map();
      this._listeners.set(type, bucket);
    }
    const wrapped: InternalListener = (event) => fn(event as Extract<InstantPayEvent, { type: E }>);
    const key = fn as unknown as ListenerKey;
    bucket.set(key, wrapped);
    return () => this.off(type, fn);
  }

  off<E extends InstantPayEvent['type']>(type: E, fn: EventListener<E>): void {
    const bucket = this._listeners.get(type);
    if (!bucket) return;
    const key = fn as unknown as ListenerKey;
    if (bucket.has(key)) {
      bucket.delete(key);
      if (bucket.size === 0) this._listeners.delete(type);
    }
  }

  once<E extends InstantPayEvent['type']>(type: E, fn: EventListener<E>): () => void {
    const onceWrapper: EventListener<E> = (event) => {
      try { fn(event); } finally { this.off(type, onceWrapper); }
    };
    return this.on(type, onceWrapper);
  }

  emit(event: InstantPayEvent): void {
    const bucket = this._listeners.get(event.type);
    if (!bucket) return;
    for (const wrapped of bucket.values()) {
      try { wrapped(event); } catch (e) { /* ignore listener errors */ }
    }
  }

  clear(): void { this._listeners.clear(); }
}

