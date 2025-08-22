import { Component, Show, createSignal } from 'solid-js';
import { toDecimals } from '@tonkeeper/instantpay-sdk';
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
  const cls = () => `border rounded-none md:rounded-lg px-4 py-3 transition-colors ${props.isActive ? 'bg-surface-content border-brand-blue/60' : 'bg-surface-content border-surface-tint hover:border-brand-blue/40'}`;

  return (
    <div class={cls()}>
      <div class="flex items-center justify-between gap-3">
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold text-ink-primary truncate">{s().title}</div>
        </div>
        <div class="shrink-0 flex items-center gap-2">
          <button
            onClick={() => props.onCustomize(s())}
            class="bg-button-secondary hover:bg-button-secondary-hover text-button-secondary-fg disabled:bg-button-secondary-disabled px-3 py-1.5 rounded font-semibold text-xs transition-colors"
          >
            Customize
          </button>
          <button
            onClick={() => props.onRun(s())}
            class="bg-button-primary hover:bg-button-primary-hover text-button-primary-fg disabled:bg-button-primary-disabled px-3 py-1.5 rounded font-semibold text-xs transition-colors"
          >
            Run
          </button>
        </div>
      </div>
      <div class="mt-1 text-xs text-ink-tertiary break-words">{s().description}</div>
      <button
        class="md:hidden mt-2 text-xs text-ink-secondary underline"
        aria-expanded={isExpanded()}
        onClick={() => setIsExpanded((v) => !v)}
      >
        {isExpanded() ? 'Hide details' : 'Show details'}
      </button>
      <div class={`${isExpanded() ? 'grid' : 'hidden md:grid'} mt-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2`}>
        <div class="bg-surface-tint rounded px-2 py-1">
          <div class="text-[10px] text-ink-tertiary">Amount</div>
          <div class="text-[11px] font-mono text-ink-secondary">{
            (() => {
              const req = s().params.request
              return typeof req.amount === 'bigint' ? toDecimals(req.amount, req.asset.decimals) : req.amount;
            })()
          }</div>
        </div>
        <div class="bg-surface-tint rounded px-2 py-1">
          <div class="text-[10px] text-ink-tertiary">Asset</div>
          <div class="text-[11px] font-mono text-ink-secondary">{s().params.request.asset.symbol ?? (s().params.request.asset.type === 'jetton' ? 'TOKEN' : 'TON')}</div>
        </div>
        <div class="bg-surface-tint rounded px-2 py-1 md:col-span-2 lg:col-span-1">
          <div class="text-[10px] text-ink-tertiary">Recipient</div>
          <div class="text-[11px] font-mono text-ink-secondary">{`${s().params.request.recipient.slice(0,8)}…${s().params.request.recipient.slice(-8)}`}</div>
        </div>
        <div class="bg-surface-tint rounded px-2 py-1">
          <div class="text-[10px] text-ink-tertiary">Label</div>
          <div class="text-[11px] font-mono text-ink-secondary">{s().params.label}</div>
        </div>
        <div class="bg-surface-tint rounded px-2 py-1">
          <div class="text-[10px] text-ink-tertiary">Instant Pay</div>
          <div class="text-[11px] font-mono text-ink-secondary">{String(s().params.instantPay)}</div>
        </div>
        <Show when={!!s().params.request.expiresAt}>
          <div class="bg-surface-tint rounded px-2 py-1">
            <div class="text-[10px] text-ink-tertiary">Expires</div>
            <div class="text-[11px] font-mono text-ink-secondary">{(() => { const exp = s().params.request.expiresAt; return exp ? new Date(exp*1000).toLocaleTimeString() : '—'; })()}</div>
          </div>
        </Show>
        <div class="bg-surface-tint rounded px-2 py-1 md:col-span-2 lg:col-span-1">
          <div class="text-[10px] text-ink-tertiary">Invoice ID</div>
          <div class="text-[11px] font-mono text-ink-secondary">
            {props.lastInvoiceId ? `${props.lastInvoiceId.slice(0,8)}…${props.lastInvoiceId.slice(-8)}` : '—'}
          </div>
        </div>
      </div>
      <Show when={isExpanded()}>
        <div class="md:hidden mt-2 text-[11px] text-brand-green italic">{s().expectedOutcome}</div>
      </Show>
    </div>
  );
};

