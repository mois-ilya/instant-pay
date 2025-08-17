import type { InstantPayProvider, PayButtonParams, PaymentRequest, RequestPaymentCompletionEvent } from '@tonkeeper/instantpay-protocol';
import { InstantPayEmitter } from '@tonkeeper/instantpay-utils';

// TODO: Implement Deeplink provider
// This will handle wallet connections via deeplink URLs
// for mobile wallets that don't support TonConnect

export class DeeplinkAdapter implements InstantPayProvider {
  public readonly events = new InstantPayEmitter();

  setPayButton(_params: PayButtonParams): void {
    // TODO: Implement deeplink button setup
    throw new Error('Deeplink provider not yet implemented');
  }

  hidePayButton(): void {
    // TODO: Implement deeplink button hiding
    throw new Error('Deeplink provider not yet implemented');
  }

  async requestPayment(_request: PaymentRequest): Promise<RequestPaymentCompletionEvent> {
    // TODO: Implement deeplink payment request
    throw new Error('Deeplink provider not yet implemented');
  }

  getActive(): { request: PaymentRequest } | null {
    // TODO: Implement active request tracking
    return null;
  }
}

export function createDeeplinkProvider(): InstantPayProvider {
  return new DeeplinkAdapter();
} 