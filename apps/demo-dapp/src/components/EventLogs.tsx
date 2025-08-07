import { Component, Show, For, onMount, createSignal } from 'solid-js';
import { InstantPay, InstantPayEmitter, IPEvent } from '@tonkeeper/instantpay-sdk';

interface EventLogsProps {
  instantPay: InstantPay | null;
}

export const EventLogs: Component<EventLogsProps> = (props) => {
  const [events, setEvents] = createSignal<(IPEvent & { timestamp: number })[]>([]);
  
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toISOString();
  };

  const getEventIcon = (type: IPEvent['type']) => {
    switch (type) {
      case 'click':
        return '👆';
      case 'sent':
        return '✅';
      case 'cancelled':
        return '❌';
      default:
        return '📝';
    }
  };

  const getEventTypeClass = (type: IPEvent['type']) => {
    switch (type) {
      case 'click':
        return 'font-bold text-blue-600 uppercase text-xs';
      case 'sent':
        return 'font-bold text-green-600 uppercase text-xs';
      case 'cancelled':
        return 'font-bold text-red-600 uppercase text-xs';
      default:
        return 'font-bold text-slate-600 uppercase text-xs';
    }
  };

  const formatEventData = (event: IPEvent) => {
    const baseData = { invoiceId: event.invoiceId };
    if (event.type === 'sent') {
      return { ...baseData, boc: event.boc };
    }
    return baseData;
  };

  onMount(() => {
    if (props.instantPay) {
      setupEventListeners(props.instantPay.events);
    }
  });


  const setupEventListeners = (events: InstantPayEmitter) => {
    console.log('[EventLogs] Setting up listeners for events emitter:', events);
    // Listen to all InstantPay events
    const eventTypes: IPEvent['type'][] = ['click', 'sent', 'cancelled'];
    
    eventTypes.forEach((eventType) => {
      console.log('[EventLogs] Adding listener for:', eventType);
      events.on(eventType, (event) => {
        console.log('[EventLogs] Received InstantPay event:', event);
        // Add event to the beginning of the array (newest first) with timestamp
        const eventWithTimestamp = { ...event, timestamp: Date.now() };
        setEvents(prev => {
          console.log('[EventLogs] Adding event to list, current count:', prev.length);
          return [eventWithTimestamp, ...prev];
        });
      });
    });
  };

  const clearEvents = () => {
    setEvents([]);
  };

  return (
    <div class="bg-white rounded-xl p-5 shadow-sm h-fit">
      {/* Header */}
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-semibold text-slate-800">Event Logs ({events.length})</h3>
        <button
          onClick={clearEvents}
          class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Events List */}
      <div class="max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
        <Show 
          when={events().length > 0}
          fallback={
            <div class="p-10 text-center text-slate-500 italic">
              No events yet. Try interacting with the Pay button!
            </div>
          }
        >
          <For each={events()}>
            {(event, index) => (
              <div class={`p-3 border-b border-slate-100 last:border-b-0 ${index() === 0 ? 'bg-slate-50' : 'bg-white'}`}>
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
                  <span class="text-xs text-slate-500 font-mono">
                    {formatTimestamp(event.timestamp)}
                  </span>
                </div>

                {/* Event Data */}
                <div class="bg-slate-50 rounded p-2 text-xs font-mono">
                  <pre class="whitespace-pre-wrap break-all text-slate-700">
                    {JSON.stringify(formatEventData(event), null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>

      {/* Info */}
      <div class="mt-3 text-xs text-slate-600 text-center">
        Events are displayed in real-time as they occur
      </div>
    </div>
  );
};