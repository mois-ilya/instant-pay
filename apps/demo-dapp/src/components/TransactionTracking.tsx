import { Component, Show, createSignal, createEffect } from 'solid-js';

interface TransactionTrackingProps {
  boc: string | null;
}

type TrackingStatus = 'pending' | 'processing' | 'confirmed';

interface TrackingStep {
  status: TrackingStatus;
  message: string;
}

export const TransactionTracking: Component<TransactionTrackingProps> = (props) => {
  const [currentStep, setCurrentStep] = createSignal<TrackingStep | null>(null);
  const [isTracking, setIsTracking] = createSignal(false);

  // Simulate transaction tracking by BOC
  // For real implementation, see: https://docs.tonconsole.com/academy/transaction-tracking
  const simulateTransactionTracking = async (boc: string) => {
    console.log('[TransactionTracking] Starting simulation for BOC:', boc);
    setIsTracking(true);
    
    // Simulate tracking steps
    const trackingSteps: TrackingStep[] = [
      { status: 'pending', message: 'Transaction submitted to network' },
      { status: 'processing', message: 'Transaction being processed by validators' },
      { status: 'confirmed', message: 'Transaction confirmed on blockchain' }
    ];

    for (const step of trackingSteps) {
      setCurrentStep(step);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    }
    
    setIsTracking(false);
  };

  createEffect(() => {
    if (props.boc) {
      simulateTransactionTracking(props.boc);
    } else {
      setCurrentStep(null);
      setIsTracking(false);
    }
  });

  const getStatusIcon = (status: TrackingStatus) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'processing':
        return '🔄';
      case 'confirmed':
        return '✅';
      default:
        return '📝';
    }
  };

  const getStatusClass = (status: TrackingStatus) => {
    switch (status) {
      case 'pending':
        return 'text-button-orange';
      case 'processing':
        return 'text-brand-blue';
      case 'confirmed':
        return 'text-brand-green';
      default:
        return 'text-ink-secondary';
    }
  };

  return (
    <Show when={isTracking() || currentStep()}>
      <div class="bg-surface-content rounded-xl p-5 shadow-sm mb-5 border border-surface-tint">
        <h3 class="text-lg font-semibold text-ink-primary mb-3">Transaction Tracking</h3>
        
        <Show when={currentStep()}>
          <div class="flex items-center gap-3 p-3 bg-surface-tint rounded-lg">
            <span class="text-xl">
              {getStatusIcon(currentStep()!.status)}
            </span>
            <div class="flex-1">
              <div class={`font-semibold ${getStatusClass(currentStep()!.status)}`}>
                {currentStep()!.status.toUpperCase()}
              </div>
              <div class="text-sm text-ink-secondary">
                {currentStep()!.message}
              </div>
            </div>
          </div>
        </Show>

        <Show when={props.boc}>
          <div class="mt-3 text-xs text-ink-tertiary">
            <div class="font-mono break-all">
              BOC: {props.boc}
            </div>
          </div>
        </Show>
      </div>
    </Show>
  );
}; 