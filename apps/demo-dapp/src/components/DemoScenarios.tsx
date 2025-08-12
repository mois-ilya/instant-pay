import { Component, createSignal, Show, For } from 'solid-js';
import { 
  InstantPay as InstantPay,
  PayButtonParams,
  InstantPayInvalidParamsError
} from '@tonkeeper/instantpay-sdk';
import { WalletType } from '../App';

interface DemoScenariosProps {
  instantPay: InstantPay | null;
  walletType: WalletType;
}

interface ScenarioConfig {
  id: string;
  title: string;
  description: string;
  params: Omit<PayButtonParams, 'request'> & { request: PayButtonParams['request'] };
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
      description: 'Simple TON payment',
      params: {
        request: {
          amount: '0.1',
          recipient: DEMO_RECIPIENT,
          invoiceId: crypto.randomUUID(),
          asset: { type: 'ton' },
          expiresAt: Math.floor(Date.now()/1000) + 600
        },
        label: 'buy',
        instantPay: true
      },
      expectedOutcome: 'Should show Pay button and allow transaction'
    },
    {
      id: 'jetton',
      title: 'Jetton Payment',
      description: 'Payment using a jetton token',
      params: {
        request: {
          amount: '10',
          recipient: DEMO_RECIPIENT,
          invoiceId: crypto.randomUUID(),
          asset: { type: 'jetton', master: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs' }
        },
        label: 'unlock',
        instantPay: true
      },
      expectedOutcome: 'Should show Pay button for jetton transaction'
    },
    {
      id: 'expired',
      title: 'Expired Invoice',
      description: 'Invoice that is already expired',
      params: {
        request: {
          amount: '0.2',
          recipient: DEMO_RECIPIENT,
          invoiceId: crypto.randomUUID(),
          asset: { type: 'ton' },
          expiresAt: Math.floor(Date.now()/1000) - 10
        },
        label: 'retry',
        instantPay: true
      },
      expectedOutcome: 'Wallet should emit cancelled(expired) on click'
    },
    {
      id: 'invalid-params',
      title: 'Invalid Parameters',
      description: 'Payment with invalid recipient address',
      params: {
        request: {
          amount: '1',
          recipient: 'invalid-address',
          invoiceId: crypto.randomUUID(),
          asset: { type: 'ton' }
        },
        label: 'buy',
        instantPay: true
      },
      expectedOutcome: 'Should throw InstantPayInvalidParamsError'
    },
    {
      id: 'different-labels',
      title: 'Different Pay Labels',
      description: 'Test various pay button labels',
      params: {
        request: {
          amount: '0.5',
          recipient: DEMO_RECIPIENT,
          invoiceId: crypto.randomUUID(),
          asset: { type: 'ton' }
        },
        label: 'try',
        instantPay: true
      },
      expectedOutcome: 'Should show Pay button with "try" label'
    },
    {
      id: 'replacement',
      title: 'Replacement before click',
      description: 'Second setPayButton replaces first and emits cancelled(replaced)',
      params: {
        request: {
          amount: '0.3',
          recipient: DEMO_RECIPIENT,
          invoiceId: crypto.randomUUID(),
          asset: { type: 'ton' }
        },
        label: 'buy',
        instantPay: true
      },
      expectedOutcome: 'Should emit cancelled(replaced) for the first invoice'
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
      const params: PayButtonParams = {
        ...scenario.params,
        request: { ...scenario.params.request, invoiceId: crypto.randomUUID() }
      };

      console.log('Running scenario:', scenario.title, params);
      
      if (scenario.id === 'replacement') {
        // First set
        props.instantPay.setPayButton(params);
        await new Promise(r => setTimeout(r, 500));
        // Replace before click with new invoiceId
        const replacement: PayButtonParams = {
          ...params,
          request: { ...params.request, invoiceId: crypto.randomUUID() },
        };
        props.instantPay.setPayButton(replacement);
      } else {
        props.instantPay.setPayButton(params, {
          onUnsupported: ({ open }) => {
            const btn = document.getElementById('fallback');
            if (btn) {
              btn.textContent = 'Open in Tonkeeper';
              (btn as HTMLButtonElement).onclick = open;
              return () => { (btn as HTMLButtonElement).onclick = null; };
            }
          }
        });
      }
      
    } catch (err) {
      console.error('Scenario error:', err);
      
      if (err instanceof InstantPayInvalidParamsError) {
        setError(`Invalid Parameters: ${err.message}`);
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
    const labels = ['buy','unlock','use','get','open','start','retry','show','play','try'] as const;
    let currentIndex = 0;
    
    const cycle = () => {
      if (currentIndex >= labels.length) {
        hidePayButton();
        return;
      }
      
      const params: PayButtonParams = {
        request: {
          amount: '0.1',
          recipient: DEMO_RECIPIENT,
          invoiceId: crypto.randomUUID(),
          asset: { type: 'ton' }
        },
        label: labels[currentIndex],
        instantPay: true
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
          <button id="fallback" class="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors">
            Fallback (deep link)
          </button>
          
          <button
            onClick={cycleThroughLabels}
            disabled={!props.instantPay}
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
                  <div><strong>Amount:</strong> {scenario.params.request.amount}</div>
                  <div><strong>Label:</strong> {scenario.params.label}</div>
                  <Show when={scenario.params.request.asset.type === 'jetton'}>
                    <div><strong>Jetton:</strong> {(scenario.params.request.asset.type === 'jetton' ? scenario.params.request.asset.master.slice(0, 20) : '')}...</div>
                  </Show>
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