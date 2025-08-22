import { Component, Show, For, createSignal, createEffect, onCleanup } from 'solid-js';
import { InstantPay } from '@tonkeeper/instantpay-sdk';
import type { InstantPayEvent, InstantPayEventEmitter } from '@tonkeeper/instantpay-sdk';

interface EventLogsProps {
  instantPay: InstantPay | null;
}

export const EventLogs: Component<EventLogsProps> = (props) => {
  const [events, setEvents] = createSignal<((InstantPayEvent) & { timestamp: number })[]>([]);
  
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toISOString();
  };

  const getEventIcon = (type: InstantPayEvent['type']) => {
    switch (type) {
      case 'show':
        return '🟩';
      case 'click':
        return '👆';
      case 'sent':
        return '✅';
      case 'voided':
        return '🚫';
      case 'cancelled':
        return '❌';
      
      default:
        return '📝';
    }
  };

  const getEventTypeClass = (type: InstantPayEvent['type']) => {
    switch (type) {
      case 'show':
        return 'font-bold text-brand-blue uppercase text-xs';
      case 'click':
        return 'font-bold text-brand-blue uppercase text-xs';
      case 'sent':
        return 'font-bold text-brand-green uppercase text-xs';
      case 'voided':
        return 'font-bold text-brand-orange uppercase text-xs';
      case 'cancelled':
        return 'font-bold text-brand-red uppercase text-xs';
      
      default:
        return 'font-bold text-ink-secondary uppercase text-xs';
    }
  };

  const formatEventData = (event: InstantPayEvent) => {
    switch (event.type) {
      case 'sent':
        return { request: event.request, boc: event.boc };
      case 'voided':
        return { request: event.request, reason: event.reason };
      case 'cancelled':
        return { request: event.request, reason: event.reason };
      case 'click':
      case 'show':
        return { request: event.request };
      default:
        return {} as never;
    }
  };

  let cleanups: Array<() => void> = [];

  createEffect(() => {
    // Dispose previous listeners
    for (const c of cleanups) {
      try { c(); } catch { /* noop */ }
    }
    cleanups = [];

    const sdk = props.instantPay;
    if (sdk) {
      const unsubs = setupEventListeners(sdk.events);
      cleanups = unsubs;
    }
  });

  onCleanup(() => {
    for (const c of cleanups) {
      try { c(); } catch { /* noop */ }
    }
    cleanups = [];
  });


  const setupEventListeners = (events: InstantPayEventEmitter): Array<() => void> => {
    console.log('[EventLogs] Setting up listeners for events emitter:', events);
    // Listen to all InstantPay events
    const eventTypes: InstantPayEvent['type'][] = ['show', 'click', 'sent', 'voided', 'cancelled'];
    
    const unsubs: Array<() => void> = [];
    eventTypes.forEach((eventType) => {
      console.log('[EventLogs] Adding listener for:', eventType);
      const off = events.on(eventType, (event: InstantPayEvent) => {
        console.log('[EventLogs] Received InstantPay event:', event);
        // Add event to the beginning of the array (newest first) with timestamp
        const eventWithTimestamp = { ...event, timestamp: Date.now() };
        setEvents(prev => {
          console.log('[EventLogs] Adding event to list, current count:', prev.length);
          return [eventWithTimestamp, ...prev];
        });
      });
      unsubs.push(off);
    });

    return unsubs;
  };

  const clearEvents = () => {
    setEvents([]);
  };

  return (
    <div class="bg-surface-content rounded-xl p-5 shadow-sm h-full flex flex-col border border-surface-tint">
      {/* Header */}
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-semibold text-ink-primary">Event Logs ({events.length})</h3>
        <button
          onClick={clearEvents}
          class="bg-brand-red hover:bg-brand-red/90 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Events List */}
      <div class="flex-1 overflow-y-auto border border-separator-common rounded-lg">
        <Show 
          when={events().length > 0}
          fallback={
            <div class="p-10 text-center text-ink-tertiary italic">
              No events yet. Try interacting with the Pay button!
            </div>
          }
        >
          <For each={events()}>
            {(event, index) => (
              <div class={`p-3 border-b border-separator-common last:border-b-0 ${index() === 0 ? 'bg-surface-tint' : 'bg-surface-content'}`}>
                {/* Event Header */}
                <div class="flex justify-between items-center mb-2">
                  <div class="flex items-center gap-2">
                    <span class="text-base">
                      {getEventIcon(event.type)}
                    </span>
                    <span class={getEventTypeClass(event.type)}>
                      {event.type}
                    </span>
                  </div>
                  <span class="text-xs text-ink-tertiary font-mono">
                    {formatTimestamp(event.timestamp)}
                  </span>
                </div>

                {/* Event Data */}
                <div class="bg-surface-tint rounded p-2 text-xs font-mono">
                  <pre class="whitespace-pre-wrap break-all text-ink-secondary">
                    {JSON.stringify(formatEventData(event), null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>

      {/* Info */}
      <div class="mt-3 text-xs text-ink-secondary text-center">
        Events are displayed in real-time as they occur
      </div>
    </div>
  );
};