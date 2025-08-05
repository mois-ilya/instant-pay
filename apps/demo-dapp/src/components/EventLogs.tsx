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

  const getEventColor = (type: IPEvent['type']) => {
    switch (type) {
      case 'click':
        return '#3498db';
      case 'sent':
        return '#27ae60';
      case 'cancelled':
        return '#e74c3c';
      default:
        return '#95a5a6';
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
    <div style={{
      'background': 'white',
      'border-radius': '12px',
      'padding': '20px',
      'box-shadow': '0 2px 8px rgba(0,0,0,0.1)',
      'height': 'fit-content'
    }}>
      {/* Header */}
      <div style={{
        'display': 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'margin-bottom': '15px'
      }}>
        <h3 style={{ 'margin': '0', 'color': '#2c3e50' }}>
          Event Logs ({props.events.length})
        </h3>
        <button
          onClick={props.onClear}
          style={{
            'background': '#e74c3c',
            'color': 'white',
            'border': 'none',
            'border-radius': '6px',
            'padding': '6px 12px',
            'font-size': '12px',
            'cursor': 'pointer',
            'font-weight': 'bold'
          }}
          onMouseOver={(e) => e.target.style.background = '#c0392b'}
          onMouseOut={(e) => e.target.style.background = '#e74c3c'}
        >
          Clear
        </button>
      </div>

      {/* Events List */}
      <div style={{
        'max-height': '400px',
        'overflow-y': 'auto',
        'border': '1px solid #e9ecef',
        'border-radius': '6px'
      }}>
        <Show 
          when={props.events.length > 0}
          fallback={
            <div style={{
              'padding': '40px 20px',
              'text-align': 'center',
              'color': '#95a5a6',
              'font-style': 'italic'
            }}>
              No events yet. Try interacting with the Pay button!
            </div>
          }
        >
          <For each={props.events}>
            {(event, index) => (
              <div
                style={{
                  'padding': '12px',
                  'border-bottom': index() < props.events.length - 1 ? '1px solid #f1f3f4' : 'none',
                  'background': index() === 0 ? '#f8f9fa' : 'white'
                }}
              >
                {/* Event Header */}
                <div style={{
                  'display': 'flex',
                  'justify-content': 'space-between',
                  'align-items': 'center',
                  'margin-bottom': '8px'
                }}>
                  <div style={{
                    'display': 'flex',
                    'align-items': 'center',
                    'gap': '8px'
                  }}>
                    <span style={{ 'font-size': '16px' }}>
                      {getEventIcon(event.type)}
                    </span>
                    <span style={{
                      'font-weight': 'bold',
                      'color': getEventColor(event.type),
                      'text-transform': 'uppercase',
                      'font-size': '12px'
                    }}>
                      {event.type}
                    </span>
                  </div>
                  <span style={{
                    'font-size': '11px',
                    'color': '#95a5a6',
                    'font-family': 'monospace'
                  }}>
                    {formatTimestamp()}
                  </span>
                </div>

                {/* Event Data */}
                <div style={{
                  'background': '#f8f9fa',
                  'border-radius': '4px',
                  'padding': '8px',
                  'font-size': '11px',
                  'font-family': 'monospace'
                }}>
                  <pre style={{
                    'margin': '0',
                    'white-space': 'pre-wrap',
                    'word-break': 'break-all',
                    'color': '#495057'
                  }}>
                    {JSON.stringify(formatEventData(event), null, 2)}
                  </pre>
                </div>

                {/* Special handling for BOC data */}
                <Show when={event.type === 'sent' && 'boc' in event}>
                  <div style={{
                    'margin-top': '8px',
                    'padding': '6px 8px',
                    'background': '#d4edda',
                    'border-radius': '4px',
                    'font-size': '10px',
                    'color': '#155724'
                  }}>
                    <strong>Transaction broadcasted!</strong> BOC length: {event.boc?.length || 0} characters
                  </div>
                </Show>
              </div>
            )}
          </For>
        </Show>
      </div>

      {/* Info */}
      <div style={{
        'margin-top': '10px',
        'font-size': '12px',
        'color': '#6c757d',
        'text-align': 'center'
      }}>
        Events are displayed in real-time as they occur
      </div>
    </div>
  );
};