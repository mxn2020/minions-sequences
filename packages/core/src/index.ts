/**
 * Minions Sequences SDK
 *
 * Multi-step email drip campaigns, cadence rules, A/B variants, and open/reply tracking
 *
 * @module @minions-sequences/sdk
 */

export const VERSION = '0.1.0';

/**
 * Example: Create a client instance for Minions Sequences.
 * Replace this with your actual SDK entry point.
 */
export function createClient(options = {}) {
    return {
        version: VERSION,
        ...options,
    };
}

export * from './schemas/index.js';
