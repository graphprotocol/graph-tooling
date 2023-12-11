import { describe, expect, test } from 'vitest';
import { typeSuggestion } from './schema';

describe.concurrent('Schema validation', () => {
  test('Type suggestions', () => {
    expect(typeSuggestion('Address')).toEqual('Bytes');
    expect(typeSuggestion('address')).toEqual('Bytes');
    expect(typeSuggestion('bytes')).toEqual('Bytes');
    expect(typeSuggestion('string')).toEqual('String');
    expect(typeSuggestion('bool')).toEqual('Boolean');
    expect(typeSuggestion('boolean')).toEqual('Boolean');
    expect(typeSuggestion('float')).toEqual('BigDecimal');
    expect(typeSuggestion('Float')).toEqual('BigDecimal');

    expect(typeSuggestion(`int`)).toBe('Int');
    expect(typeSuggestion(`uint`)).toBe('BigInt');
    expect(typeSuggestion(`uint32`)).toBe('BigInt');
    expect(typeSuggestion(`int8`)).toBe('Int8');
    expect(typeSuggestion(`i8`)).toBe('Int8');
    expect(typeSuggestion(`u8`)).toBe('Int8');
    expect(typeSuggestion(`uint8`)).toBe('Int8');

    // Test i16..i32, int17..int32
    for (let i = 16; i <= 32; i += 8) {
      expect(typeSuggestion(`i${i}`)).toBe('Int');
      expect(typeSuggestion(`int${i}`)).toBe('Int');
    }

    // Test u16..u24, uint16..uint24
    for (let i = 16; i <= 24; i += 8) {
      expect(typeSuggestion(`u${i}`)).toBe('Int');
      expect(typeSuggestion(`uint${i}`)).toBe('Int');
    }

    // Test i40..i256, int40..int256, u40..u256, uint40..uint256
    for (let i = 40; i <= 256; i += 8) {
      expect(typeSuggestion(`i${i}`)).toBe('BigInt');
      expect(typeSuggestion(`int${i}`)).toBe('BigInt');
      expect(typeSuggestion(`u${i}`)).toBe('BigInt');
      expect(typeSuggestion(`uint${i}`)).toBe('BigInt');
    }
  });
});
