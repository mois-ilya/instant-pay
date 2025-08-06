/**
 * InstantPay Validation Functions
 * 
 * Parameter validation for InstantPay SDK operations.
 * Validates payment parameters, addresses, and configuration.
 */

import type { Config as InstantPayConfig, SetPayButtonParams } from '@tonkeeper/instantpay-protocol';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate SetPayButtonParams object
 */
export function validateSetPayButtonParams(
  params: unknown,
  config: InstantPayConfig
): ValidationResult & { params?: SetPayButtonParams } {
  if (!params || typeof params !== 'object') {
    return { valid: false, error: 'Parameters must be an object' };
  }

  const p = params as any;

  // Validate required fields
  if (typeof p.amount !== 'string') {
    return { valid: false, error: 'amount must be a string' };
  }

  if (typeof p.recipient !== 'string') {
    return { valid: false, error: 'recipient must be a string' };
  }

  if (typeof p.label !== 'string') {
    return { valid: false, error: 'label must be a string' };
  }

  if (typeof p.invoiceId !== 'string') {
    return { valid: false, error: 'invoiceId must be a string' };
  }

  // Validate amount format
  if (!isValidDecimalString(p.amount)) {
    return { valid: false, error: 'amount must be a valid decimal string' };
  }

  // Validate amount is positive
  const amount = parseFloat(p.amount);
  if (isNaN(amount) || amount <= 0) {
    return { valid: false, error: 'amount must be positive' };
  }

  // Validate recipient address
  if (!isValidTonAddress(p.recipient)) {
    return { valid: false, error: 'recipient must be a valid TON address' };
  }

  // Validate label
  if (!config.labels.includes(p.label)) {
    return { 
      valid: false, 
      error: `label must be one of: ${config.labels.join(', ')}` 
    };
  }

  // Validate invoiceId format (UUID)
  if (!isValidUUID(p.invoiceId)) {
    return { valid: false, error: 'invoiceId must be a valid UUID' };
  }

  // Validate optional jetton address
  if (p.jetton !== undefined) {
    if (typeof p.jetton !== 'string') {
      return { valid: false, error: 'jetton must be a string' };
    }

    if (!isValidTonAddress(p.jetton)) {
      return { valid: false, error: 'jetton must be a valid TON address' };
    }

    // Check if jetton is supported
    const supportedJetton = config.jettons.find(j => j.address === p.jetton);
    if (!supportedJetton) {
      return { valid: false, error: 'jetton is not supported by this wallet' };
    }
  }

  // Validate optional ADNL address
  if (p.adnlAddress !== undefined) {
    if (typeof p.adnlAddress !== 'string') {
      return { valid: false, error: 'adnlAddress must be a string' };
    }
    // ADNL address validation could be added here
  }

  return { valid: true };
}

/**
 * Validate InstantPayConfig object
 */
export function validateInstantPayConfig(config: unknown): ValidationResult {
  if (!config || typeof config !== 'object') {
    return { valid: false, error: 'Config must be an object' };
  }

  const c = config as any;

  // Validate network
  if (!c.network || !['mainnet', 'testnet'].includes(c.network)) {
    return { valid: false, error: 'network must be "mainnet" or "testnet"' };
  }

  // Validate instantPayLimitTon
  if (typeof c.instantPayLimitTon !== 'string') {
    return { valid: false, error: 'instantPayLimitTon must be a string' };
  }

  if (!isValidDecimalString(c.instantPayLimitTon)) {
    return { valid: false, error: 'instantPayLimitTon must be a valid decimal string' };
  }

  // Validate jettons array
  if (!Array.isArray(c.jettons)) {
    return { valid: false, error: 'jettons must be an array' };
  }

  for (const jetton of c.jettons) {
    const jettonValidation = validateJettonConfig(jetton);
    if (!jettonValidation.valid) {
      return jettonValidation;
    }
  }

  // Validate payLabels array
  if (!Array.isArray(c.payLabels)) {
    return { valid: false, error: 'payLabels must be an array' };
  }

  const validLabels = ['buy', 'unlock', 'use', 'get', 'open', 'start', 'retry', 'show', 'play', 'try'];
  for (const label of c.payLabels) {
    if (!validLabels.includes(label)) {
      return { valid: false, error: `Invalid pay label: ${label}` };
    }
  }

  return { valid: true };
}

/**
 * Validate jetton configuration
 */
function validateJettonConfig(jetton: any): ValidationResult {
  if (!jetton || typeof jetton !== 'object') {
    return { valid: false, error: 'Jetton config must be an object' };
  }

  if (typeof jetton.symbol !== 'string') {
    return { valid: false, error: 'Jetton symbol must be a string' };
  }

  if (typeof jetton.address !== 'string') {
    return { valid: false, error: 'Jetton address must be a string' };
  }

  if (!isValidTonAddress(jetton.address)) {
    return { valid: false, error: 'Jetton address must be a valid TON address' };
  }

  if (typeof jetton.decimals !== 'number') {
    return { valid: false, error: 'Jetton decimals must be a number' };
  }

  if (jetton.decimals < 0 || jetton.decimals > 18) {
    return { valid: false, error: 'Jetton decimals must be between 0 and 18' };
  }

  if (typeof jetton.limit !== 'string') {
    return { valid: false, error: 'Jetton limit must be a string' };
  }

  if (!isValidDecimalString(jetton.limit)) {
    return { valid: false, error: 'Jetton limit must be a valid decimal string' };
  }

  return { valid: true };
}

/**
 * Check if string is a valid decimal number
 */
function isValidDecimalString(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value);
}

/**
 * Check if string is a valid TON address
 * This is a simplified check - real implementation should use TON address validation
 * TODO: Implement real TON address validation
 */
function isValidTonAddress(address: string): boolean {
  // Simplified validation - should be 48 characters of base64url
  return /^[A-Za-z0-9_-]{48}$/.test(address);
}

/**
 * Check if string is a valid UUID v4
 */
function isValidUUID(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}