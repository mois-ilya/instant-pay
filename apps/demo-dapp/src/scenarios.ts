import type { PayButtonParams } from '@tonkeeper/instantpay-sdk';

export interface ScenarioConfig {
  id: string;
  title: string;
  description: string;
  params: PayButtonParams;
  expectedOutcome: string;
}

const DEMO_RECIPIENT = 'UQCae11h9N5znylEPRjmuLYGvIwnxkcCw4zVW4BJjVASi5eL';

export const defaultScenarios: ScenarioConfig[] = [
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
    id: 'instant-over-limit',
    title: 'Instant Over Capabilities Limit',
    description: 'Amount exceeds instant capability limit -> wallet shows confirm window (no sent)',
    params: {
      request: {
        amount: '9999',
        recipient: DEMO_RECIPIENT,
        invoiceId: crypto.randomUUID(),
        asset: { type: 'ton' }
      },
      label: 'buy',
      instantPay: true
    },
    expectedOutcome: 'Wallet emits click, opens confirmation popup; sent only after manual Approve'
  },
  {
    id: 'no-instant-flag',
    title: 'Instant Disabled Flag',
    description: 'instantPay=false -> wallet requires confirmation (no auto sent)',
    params: {
      request: {
        amount: '0.1',
        recipient: DEMO_RECIPIENT,
        invoiceId: crypto.randomUUID(),
        asset: { type: 'ton' }
      },
      label: 'buy',
      instantPay: false
    },
    expectedOutcome: 'Wallet emits click, opens confirmation popup; no sent until Approve'
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
  }
];

