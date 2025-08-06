import { Component, Show, For } from 'solid-js';
import { IPEvent } from '@tonkeeper/instantpay-sdk';

interface EventLogsProps {
  events: IPEvent[];
  onClear: () => void;
}

export const EventLogs: Component<EventLogsProps> = (props) => {
  const formatTimestamp = (timestamp: number = Date.now()) => {
    return new Date(timestamp).toLocaleTimeString();
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

  return (
    <div class="bg-white rounded-xl p-5 shadow-sm h-fit">
      {/* Header */}
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-semibold text-slate-800">Event Logs ({props.events.length})</h3>
        <button
          onClick={props.onClear}
          class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Events List */}
      <div class="max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
        <Show 
          when={props.events.length > 0}
          fallback={
            <div class="p-10 text-center text-slate-500 italic">
              No events yet. Try interacting with the Pay button!
            </div>
          }
        >
          <For each={props.events}>
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
                    {formatTimestamp()}
                  </span>
                </div>

                {/* Event Data */}
                <div class="bg-slate-50 rounded p-2 text-xs font-mono">
                  <pre class="whitespace-pre-wrap break-all text-slate-700">
                    {JSON.stringify(formatEventData(event), null, 2)}
                  </pre>
                </div>

                {/* Special handling for BOC data */}
                <Show when={event.type === 'sent' && 'boc' in event}>
                  <div class="mt-2 p-2 bg-green-50 rounded text-green-800 text-xs">
                    <strong>Transaction broadcasted!</strong> BOC length: {(event as any).boc?.length || 0} characters
                  </div>
                </Show>
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