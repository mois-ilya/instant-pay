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
    const config = props.instantPay?.config;
    if (!config) return;
    
    const labels = config.labels;
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
    <div class="bg-white rounded-xl p-5 shadow-sm">
      <h3 class="text-xl font-semibold text-slate-800 mb-5">Demo Scenarios</h3>

      <Show 
        when={props.walletType !== 'none'}
        fallback={
          <div class="p-5 text-center text-red-600 bg-red-50 rounded-lg border border-red-200">
            No wallet available. Install Tonkeeper or enable mock wallet to test scenarios.
          </div>
        }
      >
        {/* Control Buttons */}
        <div class="flex flex-wrap gap-3 mb-5">
          <button
            onClick={hidePayButton}
            class="bg-slate-500 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
          >
            Hide Pay Button
          </button>
          
          <button
            onClick={cycleThroughLabels}
            disabled={!props.instantPay?.config?.labels?.length}
            class="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
          >
            Cycle Through Labels
          </button>
        </div>

        {/* Error Display */}
        <Show when={error()}>
          <div class="p-3 mb-5 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <strong>Error:</strong> {error()}
          </div>
        </Show>

        {/* Active Scenario Display */}
        <Show when={activeScenario()}>
          <div class="p-3 mb-5 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
            <strong>Active Scenario:</strong> {activeScenario()}
          </div>
        </Show>

        {/* Scenarios Grid */}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
          <For each={scenarios}>
            {(scenario) => (
              <div class={`border border-slate-200 rounded-lg p-4 transition-colors ${activeScenario() === scenario.id ? 'bg-slate-50' : 'bg-white'}`}>
                <h4 class="text-base font-semibold text-slate-700 mb-2">{scenario.title}</h4>
                
                <p class="text-sm text-slate-600 mb-3 leading-relaxed">{scenario.description}</p>

                <div class="bg-slate-50 rounded p-2 mb-3 text-xs font-mono space-y-1">
                  <div><strong>Amount:</strong> {scenario.params.amount}</div>
                  <div><strong>Label:</strong> {scenario.params.label}</div>
                  {scenario.params.jetton && (
                    <div><strong>Jetton:</strong> {scenario.params.jetton.slice(0, 20)}...</div>
                  )}
                </div>

                <div class="text-xs text-green-600 mb-3 italic">
                  Expected: {scenario.expectedOutcome}
                </div>

                <button
                  onClick={() => runScenario(scenario)}
                  disabled={!props.instantPay}
                  class="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-2 rounded font-semibold text-sm transition-colors"
                >
                  Run Scenario
                </button>
              </div>
            )}
          </For>
        </div>

        {/* Instructions */}
        <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 class="text-base font-semibold text-blue-900 mb-3">How to Use</h4>
          <ol class="text-sm text-blue-800 space-y-1 list-decimal ml-4">
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