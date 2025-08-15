import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import payButtonParamsSchema from '@tonkeeper/instantpay-protocol/schemas/pay-button-params.schema.json' assert { type: 'json' };
import paymentRequestSchema from '@tonkeeper/instantpay-protocol/schemas/payment-request.schema.json' assert { type: 'json' };
import assetSchema from '@tonkeeper/instantpay-protocol/schemas/asset.schema.json' assert { type: 'json' };

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

let ajv: Ajv | null = null;
let validatePayButton: ValidateFunction | null = null;

function getAjv(): Ajv {
  if (!ajv) {
    ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    ajv.addSchema(assetSchema);
    ajv.addSchema(paymentRequestSchema);
  }
  return ajv;
}

function getValidatePayButton(): ValidateFunction {
  if (!validatePayButton) {
    validatePayButton = getAjv().compile(payButtonParamsSchema);
  }
  return validatePayButton;
}

export function validatePayButtonParams(params: unknown): ValidationResult {
  const validate = getValidatePayButton();
  let normalized = params as any;
  try {
    if (normalized && typeof normalized === 'object' && 'request' in normalized) {
      const req = (normalized as any).request ?? {};
      if (typeof req.amount === 'bigint') {
        normalized = { ...normalized, request: { ...req, amount: req.amount.toString() } };
      }
    }
  } catch {}
  const ok = validate(normalized);
  if (!ok) {
    const msg = validate.errors?.[0]?.message || 'INVALID_PARAMS';
    return { valid: false, error: `INVALID_PARAMS: ${msg}` };
  }
  return { valid: true };
}

