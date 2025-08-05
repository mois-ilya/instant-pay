/**
 * InstantPay SDK Core Class
 *
 * Main implementation of the InstantPay protocol for dApps and wallets.
 * Provides setPayButton(), hidePayButton(), and event handling functionality.
 */

import type {
    Config as InstantPayConfig,
    SetPayButtonParams,
} from '@tonkeeper/instantpay-protocol';
import { InstantPayEmitter } from './events';
import { validateSetPayButtonParams } from './validation';
import {
    InstantPayInvalidParamsError,
    InstantPayLimitExceededError,
    InstantPayConcurrentOperationError,
} from './errors';

/**
 * Main InstantPay API interface
 */
export interface InstantPayAPI {
    config: InstantPayConfig;
    setPayButton(params: SetPayButtonParams): void;
    hidePayButton(): void;
    events: InstantPayEmitter;
}

/**
 * InstantPay SDK implementation
 */
export class InstantPay implements InstantPayAPI {
    public readonly events: InstantPayEmitter;

    private _config: InstantPayConfig;
    private _activeInvoiceId: string | null = null;

    constructor(config: InstantPayConfig) {
        this._config = config;
        this.events = new InstantPayEmitter();
    }

    /**
     * Get current wallet configuration
     */
    get config(): InstantPayConfig {
        return this._config;
    }

    /**
     * Render or update the Pay button
     *
     * @param params - Payment parameters
     * @throws {InstantPayInvalidParamsError} Invalid parameters
     * @throws {InstantPayLimitExceededError} Amount exceeds limits
     * @throws {InstantPayConcurrentOperationError} Another operation is active
     */
    setPayButton(params: SetPayButtonParams): void {
        // Validate parameters
        const validation = validateSetPayButtonParams(params, this._config);
        if (!validation.valid) {
            throw new InstantPayInvalidParamsError(
                validation.error || 'Invalid parameters'
            );
        }

        // Check for concurrent operations
        if (
            this._activeInvoiceId &&
            this._activeInvoiceId !== params.invoiceId
        ) {
            throw new InstantPayConcurrentOperationError(
                'Another payment operation is already active',
                this._activeInvoiceId
            );
        }

        // Check payment limits
        const limitCheck = this._checkPaymentLimits(params);
        if (!limitCheck.valid) {
            throw new InstantPayLimitExceededError(
                limitCheck.error!,
                params.invoiceId,
                limitCheck.limit!
            );
        }

        // Set active invoice
        this._activeInvoiceId = params.invoiceId;

        // In a real implementation, this would render the overlay button
        // For SDK, we just track the state
        console.log(
            `[InstantPay] Pay button set for invoice ${params.invoiceId}`
        );
    }

    /**
     * Remove the button and cancel active operation
     * Idempotent - extra calls are ignored
     */
    hidePayButton(): void {
        if (this._activeInvoiceId) {
            const invoiceId = this._activeInvoiceId;
            this._activeInvoiceId = null;

            // Emit cancelled event for active invoice
            this.events.emit({
                type: 'cancelled',
                invoiceId,
            });

            console.log(
                `[InstantPay] Pay button hidden for invoice ${invoiceId}`
            );
        }
    }

    /**
     * Get current active invoice ID
     */
    get activeInvoiceId(): string | null {
        return this._activeInvoiceId;
    }

    /**
     * Check if payment amount exceeds limits
     */
    private _checkPaymentLimits(params: SetPayButtonParams): {
        valid: boolean;
        error?: string;
        limit?: string;
    } {
        const amount = parseFloat(params.amount);

        if (params.jetton) {
            // Check jetton limits
            const jetton = this._config.jettons.find(
                (j) => j.address === params.jetton
            );
            if (!jetton) {
                return {
                    valid: false,
                    error: 'Unsupported jetton',
                    limit: '0',
                };
            }

            const limit = parseFloat(jetton.limit);
            if (amount > limit) {
                return {
                    valid: false,
                    error: `Amount ${params.amount} exceeds jetton limit`,
                    limit: jetton.limit,
                };
            }
        } else {
            // Check TON limits
            const limit = parseFloat(this._config.tonLimit);
            if (amount > limit) {
                return {
                    valid: false,
                    error: `Amount ${params.amount} exceeds TON limit`,
                    limit: this._config.tonLimit,
                };
            }
        }

        return { valid: true };
    }
}
