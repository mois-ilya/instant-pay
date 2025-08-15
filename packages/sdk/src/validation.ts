/**
 * Validation using JSON Schemas (Ajv)
 */
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
    // Register referenced schemas so $ref can resolve without network
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

  // Нормализуем bigint → string для JSON-schema в request.amount
  let normalized: unknown = params;

  const req = (params as any)?.request;
  if (req && typeof req === 'object') {
    const amount = (req as any).amount;
    if (typeof amount === 'bigint') {
      normalized = {
        ...(params as any),
        request: { ...(req as any), amount: amount.toString() },
      };
    }
  }

  const ok = validate(normalized);
  if (!ok) {
    const msg = validate.errors?.[0]?.message || 'INVALID_PARAMS';
    return { valid: false, error: `INVALID_PARAMS: ${msg}` };
  }
  return { valid: true };
}