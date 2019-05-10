const { typeSuggestion } = require('./schema')

describe('Schema validation', () => {
  test('Type suggestions', () => {
    expect(typeSuggestion('Address')).toEqual('Bytes')
    expect(typeSuggestion('address')).toEqual('Bytes')
    expect(typeSuggestion('bytes')).toEqual('Bytes')
    expect(typeSuggestion('string')).toEqual('String')
    expect(typeSuggestion('bool')).toEqual('Boolean')
    expect(typeSuggestion('boolean')).toEqual('Boolean')
    expect(typeSuggestion('float')).toEqual('BigDecimal')
    expect(typeSuggestion('Float')).toEqual('BigDecimal')

    expect(typeSuggestion(`int`)).toBe('Int')
    expect(typeSuggestion(`uint`)).toBe('BigInt')
    expect(typeSuggestion(`uint32`)).toBe('BigInt')

    // Test i8..i32, int8..int32
    for (let i = 8; i <= 32; i += 8) {
      expect(typeSuggestion(`i${i}`)).toBe('Int')
      expect(typeSuggestion(`int${i}`)).toBe('Int')
    }

    // Test u8..u24, uint8..uint24
    for (let i = 8; i <= 24; i += 8) {
      expect(typeSuggestion(`u${i}`)).toBe('Int')
      expect(typeSuggestion(`uint${i}`)).toBe('Int')
    }

    // Test i40..i256, int40..int256, u40..u256, uint40..uint256
    for (let i = 40; i <= 256; i += 8) {
      expect(typeSuggestion(`i${i}`)).toBe('BigInt')
      expect(typeSuggestion(`int${i}`)).toBe('BigInt')
      expect(typeSuggestion(`u${i}`)).toBe('BigInt')
      expect(typeSuggestion(`uint${i}`)).toBe('BigInt')
    }
  })
})
