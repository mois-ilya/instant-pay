/**
 * InstantPay SDK Core Class
 *
 * Wrapper around window.tonkeeper?.instantPay that provides the InstantPay protocol API.
 * This SDK acts as a bridge between dApps and the wallet's InstantPay implementation.
 */

import type {
    Config as InstantPayConfig,
    SetPayButtonParams,
} from '@tonkeeper/instantpay-protocol';
import { InstantPayEmitter } from './events';
import { validateSetPayButtonParams } from './validation';
import { InstantPayInvalidParamsError } from './errors';

// Declare global type for window.tonkeeper
declare global {
    interface Window {
        tonkeeper?: {
            instantPay?: InstantPayAPI;
        };
    }
}

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
 * InstantPay SDK implementation - wrapper around window.tonkeeper?.instantPay
 */
export class InstantPay {
    public readonly events: InstantPayEmitter;
    private readonly _walletAPI: InstantPayAPI;

    constructor() {
        const walletAPI = window?.tonkeeper?.instantPay;
        if (!walletAPI) {
            throw new Error('InstantPay SDK not initialized with wallet API');
        }

        this._walletAPI = walletAPI;
        this.events = new InstantPayEmitter();

        // Forward events from wallet API to our emitter
        this._setupEventForwardingInstantPay();
    }

    /**
     * Setup event forwarding from wallet API to SDK emitter
     */
    private _setupEventForwardingInstantPay(): void {
        console.log('[InstantPay] Setting up event forwarding from wallet API to SDK');
        const eventTypes = ['click', 'sent', 'cancelled'] as const;
        eventTypes.forEach((eventType) => {
            console.log('[InstantPay] Setting up forwarding for:', eventType);
            this._walletAPI.events.on(eventType, (event) => {
                console.log('[InstantPay] Forwarding event from wallet API:', event);
                this.events.emit(event);
            });
        });
    }

    static isAvailable(): boolean {
        return window?.tonkeeper?.instantPay !== undefined;
    }

    /**
     * Get current wallet configuration
     */
    get config(): InstantPayConfig {
        return this._walletAPI.config;
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
        // Optional: Add SDK-level validation before delegating to wallet
        const validation = validateSetPayButtonParams(
            params,
            this._walletAPI.config
        );
        if (!validation.valid) {
            throw new InstantPayInvalidParamsError(
                validation.error || 'Invalid parameters'
            );
        }

        // Delegate to wallet API
        this._walletAPI.setPayButton(params);
    }

    /**
     * Remove the button and cancel active operation
     * Idempotent - extra calls are ignored
     */
    hidePayButton(): void {
        // Delegate to wallet API
        this._walletAPI.hidePayButton();
    }

    /**
     * Check if wallet API is available
     */
    get isAvailable(): boolean {
        return this._walletAPI !== null;
    }
}
