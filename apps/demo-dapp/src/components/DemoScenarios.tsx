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
  const DEMO_RECIPIENT = 'UQCae11h9N5znylEPRjmuLYGvIwnxkcCw4zVW4BJjVASi5eL';

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
        props.instantPay.setPayButton(params);
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

      {/* Scenarios List (compact vertical cards) */}
      <div class="flex flex-col gap-3 mb-5">
        <For each={scenarios}>
          {(scenario) => (
            <div class={`border border-slate-200 rounded-lg px-4 py-3 transition-colors ${activeScenario() === scenario.id ? 'bg-slate-50' : 'bg-white'}`}>
              {/* Top row: title, expected outcome, run button */}
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <div class="text-sm font-semibold text-slate-800 truncate">{scenario.title}</div>
                  <div class="text-xs text-slate-500 truncate">{scenario.description}</div>
                </div>
                <div class="hidden md:block text-[11px] text-green-600 italic whitespace-nowrap mr-2">
                  {scenario.expectedOutcome}
                </div>
                <button
                  onClick={() => runScenario(scenario)}
                  disabled={!props.instantPay}
                  class="shrink-0 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded font-semibold text-xs transition-colors"
                >
                  Run
                </button>
              </div>

              {/* Parameters line: compact monospace summary */}
              <div class="mt-2 grid grid-cols-1 lg:grid-cols-3 gap-2">
                <div class="bg-slate-50 rounded px-2 py-1 text-[11px] font-mono text-slate-700">
                  amt={scenario.params.request.amount} label={scenario.params.label}
                </div>
                <div class="bg-slate-50 rounded px-2 py-1 text-[11px] font-mono text-slate-700">
                  asset={scenario.params.request.asset.type === 'ton' ? 'TON' : `JETTON:${scenario.params.request.asset.master.slice(0,8)}…${scenario.params.request.asset.master.slice(-8)}`}
                </div>
                {scenario.params.request.expiresAt && (
                  <div class="bg-slate-50 rounded px-2 py-1 text-[11px] font-mono text-slate-700">
                    exp={scenario.params.request.expiresAt ? new Date(scenario.params.request.expiresAt*1000).toLocaleTimeString() : '—'}
                  </div>
                )}
              </div>

              {/* Expected outcome (mobile-visible) */}
              <div class="md:hidden mt-2 text-[11px] text-green-600 italic">
                {scenario.expectedOutcome}
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};