import { Component, Show, createSignal } from 'solid-js';
import type { ScenarioConfig } from '../scenarios';

// ScenarioConfig is imported from ../scenarios

interface DemoScenarioCardProps {
  scenario: ScenarioConfig;
  isActive: boolean;
  onRun: (s: ScenarioConfig) => void;
  onCustomize: (s: ScenarioConfig) => void;
  lastInvoiceId?: string | null;
}

export const DemoScenarioCard: Component<DemoScenarioCardProps> = (props) => {
  const [isExpanded, setIsExpanded] = createSignal(false);
  const s = () => props.scenario;
  const cls = () => `border rounded-none md:rounded-lg px-4 py-3 transition-colors ${props.isActive ? 'bg-blue-50 border-blue-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`;
  const jettonMaster = () => {
    const a = s().params.request.asset;
    return a.type === 'jetton' ? a.master : null;
  };

  return (
    <div class={cls()}>
      <div class="flex items-center justify-between gap-3">
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold text-slate-800 truncate">{s().title}</div>
        </div>
        <div class="shrink-0 flex items-center gap-2">
          <button
            onClick={() => props.onCustomize(s())}
            class="bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-1.5 rounded font-semibold text-xs transition-colors"
          >
            Customize
          </button>
          <button
            onClick={() => props.onRun(s())}
            class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded font-semibold text-xs transition-colors"
          >
            Run
          </button>
        </div>
      </div>
      <div class="mt-1 text-xs text-slate-500 break-words">{s().description}</div>
      <button
        class="md:hidden mt-2 text-xs text-slate-700 underline"
        aria-expanded={isExpanded()}
        onClick={() => setIsExpanded((v) => !v)}
      >
        {isExpanded() ? 'Hide details' : 'Show details'}
      </button>
      <div class={`${isExpanded() ? 'grid' : 'hidden md:grid'} mt-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2`}>
        <div class="bg-slate-50 rounded px-2 py-1">
          <div class="text-[10px] text-slate-500">Amount</div>
          <div class="text-[11px] font-mono text-slate-700">{s().params.request.amount}</div>
        </div>
        <div class="bg-slate-50 rounded px-2 py-1">
          <div class="text-[10px] text-slate-500">Asset</div>
          <div class="text-[11px] font-mono text-slate-700">{s().params.request.asset.type === 'ton' ? 'TON' : 'JETTON'}</div>
        </div>
        <Show when={s().params.request.asset.type === 'jetton'}>
          <div class="bg-slate-50 rounded px-2 py-1">
            <div class="text-[10px] text-slate-500">Jetton Master</div>
            <div class="text-[11px] font-mono text-slate-700">{jettonMaster() ? `${jettonMaster()!.slice(0,8)}…${jettonMaster()!.slice(-8)}` : ''}</div>
          </div>
        </Show>
        <div class="bg-slate-50 rounded px-2 py-1 md:col-span-2 lg:col-span-1">
          <div class="text-[10px] text-slate-500">Recipient</div>
          <div class="text-[11px] font-mono text-slate-700">{`${s().params.request.recipient.slice(0,8)}…${s().params.request.recipient.slice(-8)}`}</div>
        </div>
        <div class="bg-slate-50 rounded px-2 py-1">
          <div class="text-[10px] text-slate-500">Label</div>
          <div class="text-[11px] font-mono text-slate-700">{s().params.label}</div>
        </div>
        <div class="bg-slate-50 rounded px-2 py-1">
          <div class="text-[10px] text-slate-500">Instant Pay</div>
          <div class="text-[11px] font-mono text-slate-700">{String(s().params.instantPay)}</div>
        </div>
        <Show when={!!s().params.request.expiresAt}>
          <div class="bg-slate-50 rounded px-2 py-1">
            <div class="text-[10px] text-slate-500">Expires</div>
            <div class="text-[11px] font-mono text-slate-700">{(() => { const exp = s().params.request.expiresAt; return exp ? new Date(exp*1000).toLocaleTimeString() : '—'; })()}</div>
          </div>
        </Show>
        <div class="bg-slate-50 rounded px-2 py-1 md:col-span-2 lg:col-span-1">
          <div class="text-[10px] text-slate-500">Invoice ID</div>
          <div class="text-[11px] font-mono text-slate-700">
            {props.lastInvoiceId ? `${props.lastInvoiceId.slice(0,8)}…${props.lastInvoiceId.slice(-8)}` : '—'}
          </div>
        </div>
      </div>
      <Show when={isExpanded()}>
        <div class="md:hidden mt-2 text-[11px] text-green-600 italic">{s().expectedOutcome}</div>
      </Show>
    </div>
  );
};

