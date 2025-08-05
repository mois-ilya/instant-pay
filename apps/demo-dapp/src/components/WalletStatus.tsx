import { Component, Show } from 'solid-js';
import { InstantPayConfig } from '@tonkeeper/instantpay-sdk';
import { WalletType } from '../App';

interface WalletStatusProps {
  walletType: WalletType;
  config?: InstantPayConfig;
}

export const WalletStatus: Component<WalletStatusProps> = (props) => {
  const getStatusBadge = () => {
    switch (props.walletType) {
      case 'real':
        return {
          text: 'Real Wallet',
          color: '#27ae60',
          bgColor: '#d5f4e6'
        };
      case 'mock':
        return {
          text: 'Mock Wallet',
          color: '#f39c12',
          bgColor: '#fef5e7'
        };
      case 'none':
        return {
          text: 'No Wallet',
          color: '#e74c3c',
          bgColor: '#fdf2f2'
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <div style={{
      'background': 'white',
      'border-radius': '12px',
      'padding': '20px',
      'box-shadow': '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ 'margin': '0 0 15px 0', 'color': '#2c3e50' }}>
        Wallet Connection Status
      </h3>
      
      {/* Status Badge */}
      <div style={{
        'display': 'inline-block',
        'padding': '8px 16px',
        'border-radius': '20px',
        'background-color': badge.bgColor,
        'color': badge.color,
        'font-weight': 'bold',
        'font-size': '14px',
        'margin-bottom': '15px'
      }}>
        {badge.text}
      </div>

      <Show when={props.config}>
        <div style={{ 'margin-top': '15px' }}>
          <h4 style={{ 'margin': '0 0 10px 0', 'color': '#34495e', 'font-size': '16px' }}>
            Configuration
          </h4>
          
          <div style={{ 'font-size': '14px', 'color': '#7f8c8d', 'line-height': '1.5' }}>
            <div style={{ 'margin-bottom': '8px' }}>
              <strong>Network:</strong> {props.config!.network}
            </div>
            <div style={{ 'margin-bottom': '8px' }}>
              <strong>TON Limit:</strong> {props.config!.instantPayLimitTon} TON
            </div>
            <div style={{ 'margin-bottom': '8px' }}>
              <strong>Jettons:</strong> {props.config!.jettons.length} supported
            </div>
            <div>
              <strong>Pay Labels:</strong> {props.config!.payLabels.join(', ')}
            </div>
          </div>

          <Show when={props.config!.jettons.length > 0}>
            <details style={{ 'margin-top': '15px' }}>
              <summary style={{ 
                'cursor': 'pointer', 
                'color': '#3498db',
                'font-weight': 'bold',
                'font-size': '14px'
              }}>
                View Supported Jettons ({props.config!.jettons.length})
              </summary>
              <div style={{ 
                'margin-top': '10px',
                'padding': '10px',
                'background': '#f8f9fa',
                'border-radius': '6px',
                'font-size': '12px'
              }}>
                {props.config!.jettons.map((jetton, index) => (
                  <div 
                    key={index}
                    style={{ 
                      'margin-bottom': '8px',
                      'padding': '8px',
                      'background': 'white',
                      'border-radius': '4px',
                      'border': '1px solid #e9ecef'
                    }}
                  >
                    <div><strong>{jetton.symbol}</strong></div>
                    <div style={{ 'color': '#6c757d', 'font-size': '11px', 'margin-top': '2px' }}>
                      Limit: {jetton.instantPayLimit} | Decimals: {jetton.decimals}
                    </div>
                    <div style={{ 
                      'color': '#6c757d', 
                      'font-size': '10px', 
                      'font-family': 'monospace',
                      'word-break': 'break-all',
                      'margin-top': '2px'
                    }}>
                      {jetton.address}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </Show>
        </div>
      </Show>

      <Show when={props.walletType === 'none'}>
        <div style={{
          'margin-top': '15px',
          'padding': '12px',
          'background': '#fdf2f2',
          'border-radius': '6px',
          'color': '#721c24',
          'font-size': '14px'
        }}>
          <strong>No wallet detected.</strong> Install Tonkeeper extension or use the mock wallet for testing.
        </div>
      </Show>
    </div>
  );
};