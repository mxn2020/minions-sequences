import { describe, it, expect } from 'vitest';
import { createClient, VERSION } from '../src/index.js';

describe('@minions-sequences/sdk', () => {
    it('should export VERSION', () => {
        expect(VERSION).toBe('0.1.0');
    });

    it('should create a client', () => {
        const client = createClient();
        expect(client.version).toBe('0.1.0');
    });

    it('should accept options', () => {
        const client = createClient({ debug: true });
        expect(client.debug).toBe(true);
    });
});
