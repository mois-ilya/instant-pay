import { Component, createSignal, Show, For } from 'solid-js';
import { 
  InstantPayAPI, 
  SetPayButtonParams,
  InstantPayInvalidParamsError,
  InstantPayLimitExceededError,
  InstantPayConcurrentOperationError
} from '@tonkeeper/instantpay-sdk';
import { WalletType } from '../App';

interface DemoScenariosProps {
  instantPay: InstantPayAPI | null;
  walletType: WalletType;
}

interface ScenarioConfig {
  id: string;
  title: string;
  description: string;
  params: SetPayButtonParams;
  expectedOutcome: string;
}

export const DemoScenarios: Component<DemoScenariosProps> = (props) => {
  const [activeScenario, setActiveScenario] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  // Sample TON address for demo
  const DEMO_RECIPIENT = 'EQC3dNlesgVD8YbAazcauIrXBPfiVhMMr5YYk2in0Mtsz0Bz';

  const scenarios: ScenarioConfig[] = [
    {
      id: 'basic-ton',
      title: 'Basic TON Payment',
      description: 'Simple TON payment within limits',
      params: {
        amount: '0.1',
        recipient: DEMO_RECIPIENT,
        label: 'buy',
        invoiceId: crypto.randomUUID()
      },
      expectedOutcome: 'Should show Pay button and allow transaction'
    },
    {
      id: 'with-jetton',
      title: 'Jetton Payment',
      description: 'Payment using a jetton token',
      params: {
        amount: '10',
        recipient: DEMO_RECIPIENT,
        label: 'unlock',
        invoiceId: crypto.randomUUID(),
        jetton: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs' // USDT
      },
      expectedOutcome: 'Should show Pay button for jetton transaction'
    },
    {
      id: 'limit-exceeded',
      title: 'Limit Exceeded',
      description: 'Payment amount exceeds instant pay limit',
      params: {
        amount: '100',
        recipient: DEMO_RECIPIENT,
        label: 'buy',
        invoiceId: crypto.randomUUID()
      },
      expectedOutcome: 'Should throw InstantPayLimitExceededError'
    },
    {
      id: 'invalid-params',
      title: 'Invalid Parameters',
      description: 'Payment with invalid recipient address',
      params: {
        amount: '1',
        recipient: 'invalid-address',
        label: 'buy',
        invoiceId: crypto.randomUUID()
      },
      expectedOutcome: 'Should throw InstantPayInvalidParamsError'
    },
    {
      id: 'different-labels',
      title: 'Different Pay Labels',
      description: 'Test various pay button labels',
      params: {
        amount: '0.5',
        recipient: DEMO_RECIPIENT,
        label: 'try',
        invoiceId: crypto.randomUUID()
      },
      expectedOutcome: 'Should show Pay button with "try" label'
    }
  ];

  const runScenario = async (scenario: ScenarioConfig) => {
    if (!props.instantPay) {
      setError('No wallet available');
      return;
    }

    setError(null);
    setActiveScenario(scenario.id);

    try {
      // Generate new invoiceId for each run
      const params = {
        ...scenario.params,
        invoiceId: crypto.randomUUID()
      };

      console.log('Running scenario:', scenario.title, params);
      
      props.instantPay.setPayButton(params);
      
      // Success - button should be visible
      console.log('Scenario executed successfully');
      
    } catch (err) {
      console.error('Scenario error:', err);
      
      if (err instanceof InstantPayInvalidParamsError) {
        setError(`Invalid Parameters: ${err.message}`);
      } else if (err instanceof InstantPayLimitExceededError) {
        setError(`Limit Exceeded: ${err.message} (Limit: ${err.limit}, Invoice: ${err.invoiceId})`);
      } else if (err instanceof InstantPayConcurrentOperationError) {
        setError(`Concurrent Operation: ${err.message} (Active: ${err.activeInvoiceId})`);
      } else {
        setError(`Unknown error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };

  const hidePayButton = () => {
    if (props.instantPay) {
      props.instantPay.hidePayButton();
      setActiveScenario(null);
      setError(null);
    }
  };

  const cycleThroughLabels = () => {
    if (!props.instantPay?.config) return;
    
    const labels = props.instantPay.config.payLabels;
    let currentIndex = 0;
    
    const cycle = () => {
      if (currentIndex >= labels.length) {
        hidePayButton();
        return;
      }
      
      const params: SetPayButtonParams = {
        amount: '0.1',
        recipient: DEMO_RECIPIENT,
        label: labels[currentIndex],
        invoiceId: crypto.randomUUID()
      };
      
      try {
        props.instantPay!.setPayButton(params);
        currentIndex++;
        setTimeout(cycle, 2000); // Change every 2 seconds
      } catch (err) {
        console.error('Label cycle error:', err);
      }
    };
    
    setActiveScenario('label-cycle');
    cycle();
  };

  return (
    <div style={{
      'background': 'white',
      'border-radius': '12px',
      'padding': '20px',
      'box-shadow': '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ 'margin': '0 0 20px 0', 'color': '#2c3e50' }}>
        Demo Scenarios
      </h3>

      <Show 
        when={props.walletType !== 'none'}
        fallback={
          <div style={{
            'padding': '20px',
            'text-align': 'center',
            'color': '#e74c3c',
            'background': '#fdf2f2',
            'border-radius': '8px',
            'border': '1px solid #f5c6cb'
          }}>
            No wallet available. Install Tonkeeper or enable mock wallet to test scenarios.
          </div>
        }
      >
        {/* Control Buttons */}
        <div style={{
          'display': 'flex',
          'gap': '10px',
          'margin-bottom': '20px',
          'flex-wrap': 'wrap'
        }}>
          <button
            onClick={hidePayButton}
            style={{
              'background': '#6c757d',
              'color': 'white',
              'border': 'none',
              'border-radius': '6px',
              'padding': '8px 16px',
              'cursor': 'pointer',
              'font-weight': 'bold'
            }}
          >
            Hide Pay Button
          </button>
          
          <button
            onClick={cycleThroughLabels}
            disabled={!props.instantPay?.config?.payLabels?.length}
            style={{
              'background': '#17a2b8',
              'color': 'white',
              'border': 'none',
              'border-radius': '6px',
              'padding': '8px 16px',
              'cursor': 'pointer',
              'font-weight': 'bold',
              'opacity': !props.instantPay?.config?.payLabels?.length ? '0.5' : '1'
            }}
          >
            Cycle Through Labels
          </button>
        </div>

        {/* Error Display */}
        <Show when={error()}>
          <div style={{
            'padding': '12px',
            'margin-bottom': '20px',
            'background': '#f8d7da',
            'border': '1px solid #f5c6cb',
            'border-radius': '6px',
            'color': '#721c24'
          }}>
            <strong>Error:</strong> {error()}
          </div>
        </Show>

        {/* Active Scenario Display */}
        <Show when={activeScenario()}>
          <div style={{
            'padding': '12px',
            'margin-bottom': '20px',
            'background': '#d1ecf1',
            'border': '1px solid #bee5eb',
            'border-radius': '6px',
            'color': '#0c5460'
          }}>
            <strong>Active Scenario:</strong> {activeScenario()}
          </div>
        </Show>

        {/* Scenarios Grid */}
        <div style={{
          'display': 'grid',
          'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
          'gap': '15px'
        }}>
          <For each={scenarios}>
            {(scenario) => (
              <div style={{
                'border': '1px solid #e9ecef',
                'border-radius': '8px',
                'padding': '15px',
                'background': activeScenario() === scenario.id ? '#f8f9fa' : 'white'
              }}>
                <h4 style={{ 'margin': '0 0 8px 0', 'color': '#495057' }}>
                  {scenario.title}
                </h4>
                
                <p style={{ 
                  'margin': '0 0 12px 0', 
                  'color': '#6c757d', 
                  'font-size': '14px',
                  'line-height': '1.4'
                }}>
                  {scenario.description}
                </p>

                <div style={{
                  'background': '#f8f9fa',
                  'border-radius': '4px',
                  'padding': '8px',
                  'margin-bottom': '12px',
                  'font-size': '11px',
                  'font-family': 'monospace'
                }}>
                  <div><strong>Amount:</strong> {scenario.params.amount}</div>
                  <div><strong>Label:</strong> {scenario.params.label}</div>
                  {scenario.params.jetton && (
                    <div><strong>Jetton:</strong> {scenario.params.jetton.slice(0, 20)}...</div>
                  )}
                </div>

                <div style={{
                  'font-size': '12px',
                  'color': '#28a745',
                  'margin-bottom': '12px',
                  'font-style': 'italic'
                }}>
                  Expected: {scenario.expectedOutcome}
                </div>

                <button
                  onClick={() => runScenario(scenario)}
                  disabled={!props.instantPay}
                  style={{
                    'background': '#007bff',
                    'color': 'white',
                    'border': 'none',
                    'border-radius': '4px',
                    'padding': '8px 12px',
                    'cursor': 'pointer',
                    'font-size': '12px',
                    'font-weight': 'bold',
                    'width': '100%',
                    'opacity': !props.instantPay ? '0.5' : '1'
                  }}
                >
                  Run Scenario
                </button>
              </div>
            )}
          </For>
        </div>

        {/* Instructions */}
        <div style={{
          'margin-top': '20px',
          'padding': '15px',
          'background': '#e7f3ff',
          'border-radius': '8px',
          'border': '1px solid #b8daff'
        }}>
          <h4 style={{ 'margin': '0 0 10px 0', 'color': '#004085' }}>
            How to Use
          </h4>
          <ol style={{ 'margin': '0', 'color': '#004085', 'font-size': '14px' }}>
            <li>Click "Run Scenario" to test different InstantPay features</li>
            <li>Watch the Event Logs panel for real-time feedback</li>
            <li>Try interacting with the Pay button when it appears</li>
            <li>Use "Hide Pay Button" to clear the current transaction</li>
            <li>Use "Cycle Through Labels" to see all available button labels</li>
          </ol>
        </div>
      </Show>
    </div>
  );
};