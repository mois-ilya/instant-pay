import { Component, createSignal, Show, For, createEffect } from 'solid-js';
import { DemoCustomConfigurator, DemoCustomPrefill } from './DemoCustomConfigurator';
import { DemoScenarioCard } from './DemoScenarioCard';
import type { ScenarioConfig } from '../scenarios';
import { 
  InstantPay as InstantPay,
  PayButtonParams,
  PaymentRequest,
  InstantPayInvalidParamsError,
  toDecimals
} from '@tonkeeper/instantpay-sdk';
import { WalletType } from '../App';

interface DemoScenariosProps {
  instantPay: InstantPay | null;
  walletType: WalletType;
  scenarios: ScenarioConfig[];
}

// ScenarioConfig is imported from ../scenarios

export const DemoScenarios: Component<DemoScenariosProps> = (props) => {
  let rootEl: HTMLDivElement | undefined;
  const [activeScenario, setActiveScenario] = createSignal<string | null>(null);
  const [lastInvoiceByScenario, setLastInvoiceByScenario] = createSignal<Record<string, string>>({});
  const [error, setError] = createSignal<{ message: string; at: Date } | null>(null);

  // Sample TON address for demo
  const DEMO_RECIPIENT = 'UQCae11h9N5znylEPRjmuLYGvIwnxkcCw4zVW4BJjVASi5eL';

  const allowedLabels: Array<PayButtonParams['label']> = ['buy','unlock','use','get','open','start','retry','show','play','try'];
  const [customPrefill, setCustomPrefill] = createSignal<DemoCustomPrefill>({
    amount: '0.1',
    asset: {
      type: 'ton',
      symbol: 'TON',
      decimals: 9
    },
    recipient: DEMO_RECIPIENT,
    label: 'buy',
    instant: true,
    expiresMinutes: '',
    invoiceId: crypto.randomUUID()
  });
  
  // Available assets from wallet capabilities + predefined demo jetton
  const availableAssets = () => {
    const caps = props.instantPay?.capabilities?.instant?.limits ?? [];
    const fromWallet = caps.map((c) => c.asset);
    const demoJetton: PaymentRequest['asset'] = {
      type: 'jetton',
      master: 'EQBR-4-x7dik6UIHSf_IE6y2i7LdPrt3dLtoilA8sObIquW8',
      symbol: 'POSASYVAET',
      decimals: 9
    };

    const demoTon: PaymentRequest['asset'] = {
      type: 'ton',
      symbol: 'TON',
      decimals: 9
    };

    return Array.from(new Set([demoTon, ...fromWallet, demoJetton]));
  };


  // handled inside DemoCustomConfigurator via onSubmit

  const populateCustomFromScenario = (scenario: ScenarioConfig) => {
    const req = scenario.params.request;
    const expiresMinutes = (() => {
      if (!req.expiresAt) return '';
      const nowSec = Math.floor(Date.now() / 1000);
      return String(Math.max(1, Math.ceil((req.expiresAt - nowSec) / 60)));
    })();
    setCustomPrefill({
      amount: typeof req.amount === 'bigint' ? toDecimals(req.amount, req.asset.decimals) : req.amount,
      asset: req.asset,
      recipient: req.recipient,
      label: scenario.params.label,
      instant: !!scenario.params.instantPay,
      expiresMinutes,
      invoiceId: crypto.randomUUID()
    });
    rootEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // scenarios are now provided via props

  const runScenario = async (scenario: ScenarioConfig) => {
    if (!props.instantPay) {
      setError({ message: 'No wallet available', at: new Date() });
      return;
    }

    setError(null);
    setActiveScenario(scenario.id);

    try {
      // Generate new invoiceId for each run
      const newId = crypto.randomUUID();
      const params: PayButtonParams = {
        ...scenario.params,
        request: { ...scenario.params.request, invoiceId: newId }
      };

      console.log('Running scenario:', scenario.title, params);
      props.instantPay.setPayButton(params);
      setLastInvoiceByScenario((prev) => ({ ...prev, [scenario.id]: newId }));
      
    } catch (err) {
      console.error('Scenario error:', err);
      
      if (err instanceof InstantPayInvalidParamsError) {
        setError({ message: `Invalid Parameters: ${err.message}`, at: new Date() });
      } else {
        setError({ message: `Unknown error: ${err instanceof Error ? err.message : String(err)}`, at: new Date() });
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

  // Clear error on any successful wallet/SDK event (non-error)
  createEffect(() => {
    const ip = props.instantPay;
    if (!ip) return;
    const clear = () => setError(null);
    const offShow = ip.events.on('show', clear);
    const offClick = ip.events.on('click', clear);
    const offSent = ip.events.on('sent', clear);
    const offCancelled = ip.events.on('cancelled', clear);
    return () => {
      offShow(); offClick(); offSent(); offCancelled();
    };
  });

  return (
    <div id="demo-scenarios" ref={el => { rootEl = el ?? undefined; }} class="bg-white rounded-none md:rounded-xl p-5 shadow-sm">
      <div class="flex items-center justify-between mb-5">
        <h3 class="text-xl font-semibold text-slate-800">Demo Scenarios</h3>
        <button
          onClick={hidePayButton}
          class="bg-slate-500 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
        >
          Hide Pay Button
        </button>
      </div>

      {/* Error Display */}
      <Show when={error()}>
        <div class="p-3 mb-5 bg-red-50 border border-red-200 rounded-lg lg:rounded-lg text-red-800">
          <div class="flex items-center gap-2 mb-1 justify-between">
            <strong>Error</strong>
            <span class="text-[11px] text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
              {(() => { const d = error()!.at; const p = (n: number) => String(n).padStart(2,'0'); return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; })()}
            </span>
          </div>
          <div class="text-sm break-words">{error() ? error()!.message : ''}</div>
        </div>
      </Show>

      <DemoCustomConfigurator
        allowedLabels={allowedLabels}
        prefill={customPrefill()}
        defaultRecipient={DEMO_RECIPIENT}
        assets={availableAssets()}
        onSubmit={(params) => {
          try {
            props.instantPay?.setPayButton(params);
            setActiveScenario('custom');
          } catch (err) {
            if (err instanceof InstantPayInvalidParamsError) {
              setError({ message: `Invalid Parameters: ${err.message}`, at: new Date() });
            } else {
              setError({ message: `Unknown error: ${err instanceof Error ? err.message : String(err)}`, at: new Date() });
            }
          }
        }}
      />

      {/* Scenarios List (compact vertical cards) */}
      <div class="flex flex-col gap-3 mb-5">
        <For each={props.scenarios}>
          {(scenario) => (
            <DemoScenarioCard
              scenario={scenario}
              isActive={activeScenario() === scenario.id}
              lastInvoiceId={lastInvoiceByScenario()[scenario.id] ?? null}
              onRun={runScenario}
              onCustomize={populateCustomFromScenario}
            />
          )}
        </For>
      </div>
    </div>
  );
};