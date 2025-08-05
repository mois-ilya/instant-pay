/**
 * InstantPay Error Classes
 * 
 * Custom error classes for InstantPay SDK operations.
 * These provide specific error types with additional context.
 */

/**
 * Base class for all InstantPay errors
 */
export abstract class InstantPayError extends Error {
  abstract readonly name: string;
  
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when setPayButton() receives invalid parameters
 */
export class InstantPayInvalidParamsError extends InstantPayError {
  readonly name = 'InstantPayInvalidParamsError' as const;
  
  constructor(message: string = 'Invalid parameters provided to setPayButton()') {
    super(message);
  }
}

/**
 * Thrown when payment amount exceeds configured limits
 */
export class InstantPayLimitExceededError extends InstantPayError {
  readonly name = 'InstantPayLimitExceededError' as const;
  
  constructor(
    message: string,
    public readonly invoiceId: string,
    public readonly limit: string
  ) {
    super(message);
  }
}

/**
 * Thrown when trying to start a new payment while another is active
 */
export class InstantPayConcurrentOperationError extends InstantPayError {
  readonly name = 'InstantPayConcurrentOperationError' as const;
  
  constructor(
    message: string,
    public readonly activeInvoiceId: string
  ) {
    super(message);
  }
}

/**
 * Thrown when attempting operations without proper wallet connection
 */
export class InstantPayWalletNotConnectedError extends InstantPayError {
  readonly name = 'InstantPayWalletNotConnectedError' as const;
  
  constructor(message: string = 'Wallet is not connected') {
    super(message);
  }
}

/**
 * Thrown when network operation fails
 */
export class InstantPayNetworkError extends InstantPayError {
  readonly name = 'InstantPayNetworkError' as const;
  
  constructor(
    message: string,
    public readonly code?: string | number
  ) {
    super(message);
  }
}