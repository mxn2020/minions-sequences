import { describe, it, expect } from 'vitest';
import { customTypes } from '../index.js';

describe('MinionTypes Schemas', () => {
    it('should export customTypes array', () => {
        expect(customTypes).toBeDefined();
        expect(Array.isArray(customTypes)).toBe(true);
    });

    // No custom types defined.

});
