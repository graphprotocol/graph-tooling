import 'allocator/arena'

// Export allocator functions for hosts to manage WASM memory
export { allocate_memory, free_memory }

/** Host database interface */
declare namespace database {
  function create(entity: string, id: string, data: Entity): void
  function update(entity: string, id: string, data: Entity): void
  function remove(entity: string, id: string): void
}

/** Host ethereum interface */
declare namespace ethereum {
  function call(call: SmartContractCall): Array<Token>
}

/** Host type conversion interface */
declare namespace typeConversion {
  function bytesToString(address: Address): string
  function bytesToHex(bytes: Bytes): string
  function u64ArrayToHex(array: U64Array): string
  function u64ArrayToString(array: U64Array): string
  function h256ToH160(h: H256): H160
  function h160ToH256(h: H160): H256
  function u256ToH160(u: U256): H160
  function u256ToH256(u: U256): H256
}

/**
 * TypedMap entry.
 */
class TypedMapEntry<K, V> {
  key: K
  value: V

  constructor(key: K, value: V) {
    this.key = key
    this.value = value
  }
}

/** Typed map */
class TypedMap<K, V> {
  entries: Array<TypedMapEntry<K, V>>

  constructor() {
    this.entries = new Array<TypedMapEntry<K, V>>()
  }

  set(key: K, value: V): void {
    let entry = this.getEntry(key)
    if (entry !== null) {
      entry.value = value
    } else {
      let entry = new TypedMapEntry<K, V>(key, value)
      this.entries.push(entry)
    }
  }

  getEntry(key: K): TypedMapEntry<K, V> | null {
    for (let i: i32 = 0; i < this.entries.length; i++) {
      if (this.entries[i].key == key) {
        return this.entries[i]
      }
    }
    return null
  }

  get(key: K): V | null {
    for (let i: i32 = 0; i < this.entries.length; i++) {
      if (this.entries[i].key == key) {
        return this.entries[i].value
      }
    }
    return null
  }
}

/**
 * Byte array
 */
class ByteArray extends Uint8Array {
  toHex(): string {
    return typeConversion.bytesToHex(this)
  }

  toString(): string {
    return typeConversion.bytesToString(this)
  }
}

/** U64Array */
class U64Array extends Uint64Array {
  toHex(): string {
    return typeConversion.u64ArrayToHex(this)
  }

  toString(): string {
    return typeConversion.u64ArrayToString(this)
  }

  toAddress(): Address {
    return typeConversion.u256ToH160(this)
  }
}

/** An Ethereum address (20 bytes). */
type Address = ByteArray

/** A dynamically-sized byte array. */
type Bytes = ByteArray

/** A 160-bit hash. */
type H160 = ByteArray

/** A 256-bit hash. */
type H256 = ByteArray

/** A signed 128-bit integer. */
type I128 = U64Array

/** A signed 256-bit integer. */
type I256 = U64Array

/** An unsigned 128-bit integer. */
type U128 = U64Array

/** An unsigned 256-bit integer. */
type U256 = U64Array

/** Type hint for Ethereum values. */
enum TokenKind {
  ADDRESS,
  FIXED_BYTES,
  BYTES,
  INT,
  UINT,
  BOOL,
  STRING,
  FIXED_ARRAY,
  ARRAY,
}

/**
 * Pointer type for Token data.
 *
 * Big enough to fit any pointer or native `this.data`.
 */
type TokenPayload = u64

/**
 * A dynamically typed value used when accessing Ethereum data.
 */
class Token {
  kind: TokenKind
  data: TokenPayload

  toAddress(): Address {
    assert(
      this.kind == TokenKind.ADDRESS ||
        this.kind == TokenKind.UINT ||
        this.kind == TokenKind.INT,
      'Token is not an address, uint or int.'
    )
    if (this.kind == TokenKind.ADDRESS) {
      return changetype<Address>(this.data as u32)
    } else if (this.kind == TokenKind.UINT) {
      return typeConversion.u256ToH160(this.toU256())
    } else if (this.kind == TokenKind.INT) {
      return typeConversion.u256ToH160(this.toI128())
    }
    throw new Error('Type conversion from ' + this.kind + ' to address not supported')
  }

  toBoolean(): boolean {
    assert(this.kind == TokenKind.BOOL, 'Token is not a boolean.')
    return this.data != 0
  }

  toBytes(): Bytes {
    assert(
      this.kind == TokenKind.FIXED_BYTES || this.kind == TokenKind.BYTES,
      'Token is not bytes.'
    )
    return changetype<Bytes>(this.data as u32)
  }

  toI8(): i8 {
    assert(
      this.kind == TokenKind.INT || this.kind == TokenKind.UINT,
      'Token is not an int or uint.'
    )
    return this.data as i8
  }

  toI16(): i16 {
    assert(
      this.kind == TokenKind.INT || this.kind == TokenKind.UINT,
      'Token is not an int or uint.'
    )
    return this.data as i16
  }

  toI32(): i32 {
    assert(
      this.kind == TokenKind.INT || this.kind == TokenKind.UINT,
      'Token is not an int or uint.'
    )
    return this.data as i32
  }

  toI128(): I128 {
    assert(
      this.kind == TokenKind.INT || this.kind == TokenKind.UINT,
      'Token is not an int or uint.'
    )
    return changetype<I128>(this.data as u32)
  }

  toI256(): I256 {
    assert(
      this.kind == TokenKind.INT || this.kind == TokenKind.UINT,
      'Token is not an int or uint.'
    )
    return changetype<I256>(this.data as u32)
  }

  toU8(): u8 {
    assert(
      this.kind == TokenKind.INT || this.kind == TokenKind.UINT,
      'Token is not an int or uint.'
    )
    return this.data as u8
  }

  toU16(): u16 {
    assert(
      this.kind == TokenKind.INT || this.kind == TokenKind.UINT,
      'Token is not an int or uint.'
    )
    return this.data as u16
  }

  toU32(): u32 {
    assert(
      this.kind == TokenKind.INT || this.kind == TokenKind.UINT,
      'Token is not an int or uint.'
    )
    return this.data as u32
  }

  toU128(): U128 {
    assert(
      this.kind == TokenKind.INT || this.kind == TokenKind.UINT,
      'Token is not an int or uint.'
    )
    return changetype<U128>(this.data as u32)
  }

  toU256(): U256 {
    assert(
      this.kind == TokenKind.INT || this.kind == TokenKind.UINT,
      'Token is not an int or uint.'
    )
    return changetype<U256>(this.data as u32)
  }

  toU256Array(): Array<U256> {
    assert(
      this.kind == TokenKind.ARRAY || this.kind == TokenKind.FIXED_ARRAY,
      'Token is not an array or fixed array.'
    )
    let tokenArray = this.toArray()
    let u256Array = new Array<U256>()
    for (let i: i32 = 0; i < tokenArray.length; i++) {
      u256Array.push(tokenArray[i].toU256())
    }
    return u256Array
  }

  toString(): string {
    assert(this.kind == TokenKind.STRING, 'Token is not a string.')
    return changetype<string>(this.data as u32)
  }

  toArray(): Array<Token> {
    assert(
      this.kind == TokenKind.FIXED_ARRAY || this.kind == TokenKind.ARRAY,
      'Token is not an array.'
    )
    return changetype<Array<Token>>(this.data as u32)
  }

  static fromAddress(address: Address): Token {
    assert(address.length == 20, 'Address must contain exactly 20 bytes')

    let token = new Token()
    token.kind = TokenKind.ADDRESS
    token.data = address as u64
    return token
  }

  static fromBoolean(b: boolean): Token {
    let token = new Token()
    token.kind = TokenKind.BOOL
    token.data = b ? 1 : 0
    return token
  }

  static fromBytes(bytes: Bytes): Token {
    let token = new Token()
    token.kind = TokenKind.BYTES
    token.data = bytes as u64
    return token
  }

  static fromI8(i: i8): Token {
    let token = new Token()
    token.kind = TokenKind.INT
    token.data = i as u64
    return token
  }

  static fromI16(i: i16): Token {
    let token = new Token()
    token.kind = TokenKind.INT
    token.data = i as u64
    return token
  }

  static fromI32(i: i32): Token {
    let token = new Token()
    token.kind = TokenKind.INT
    token.data = i as u64
    return token
  }

  static fromI128(i: I128): Token {
    let token = new Token()
    token.kind = TokenKind.INT
    token.data = i as u64
    return token
  }

  static fromI256(i: I256): Token {
    let token = new Token()
    token.kind = TokenKind.INT
    token.data = i as u64
    return token
  }

  static fromU8(u: u8): Token {
    let token = new Token()
    token.kind = TokenKind.UINT
    token.data = u as u64
    return token
  }

  static fromU16(u: u16): Token {
    let token = new Token()
    token.kind = TokenKind.UINT
    token.data = u as u64
    return token
  }

  static fromU32(u: u32): Token {
    let token = new Token()
    token.kind = TokenKind.UINT
    token.data = u as u64
    return token
  }

  static fromU128(u: U128): Token {
    let token = new Token()
    token.kind = TokenKind.UINT
    token.data = u as u64
    return token
  }

  static fromU256(u: U256): Token {
    let token = new Token()
    token.kind = TokenKind.UINT
    token.data = u as u64
    return token
  }

  static fromString(s: string): Token {
    let token = new Token()
    token.kind = TokenKind.STRING
    token.data = s as u64
    return token
  }

  static fromArray(arr: Token): Token {
    let token = new Token()
    token.kind = TokenKind.ARRAY
    token.data = arr as u64
    return token
  }
}

/**
 * Enum for supported value types.
 */
enum ValueKind {
  STRING,
  INT,
  FLOAT,
  BOOL,
  ARRAY,
  NULL,
}

/**
 * Pointer type for Value data.
 *
 * Big enough to fit any pointer or native `this.data`.
 */
type ValuePayload = u64

/**
 * A dynamically typed value.
 */
class Value {
  kind: ValueKind
  data: ValuePayload

  static fromAddress(address: Address): Value {
    let value = new Value()
    value.kind = ValueKind.STRING
    value.data = address.toHex() as u64
    return value
  }

  static fromBoolean(b: boolean): Value {
    let value = new Value()
    value.kind = ValueKind.BOOL
    value.data = b ? 1 : 0
    return value
  }

  static fromBytes(bytes: Bytes): Value {
    let value = new Value()
    value.kind = ValueKind.STRING
    value.data = bytes.toHex() as u64
    return value
  }

  static fromH256(h: H256): Value {
    let value = new Value()
    value.kind = ValueKind.STRING
    value.data = h.toHex() as u64
    return value
  }

  static fromU32(n: u32): Value {
    let value = new Value()
    value.kind = ValueKind.INT
    value.data = n as u64
    return value
  }

  static fromU256(n: U256): Value {
    let value = new Value()
    value.kind = ValueKind.STRING
    value.data = n.toHex() as u64
    return value
  }

  static fromString(s: string): Value {
    let value = new Value()
    value.kind = ValueKind.STRING
    value.data = s as u64
    return value
  }

  static fromNull(): Value {
    let value = new Value()
    value.kind = ValueKind.NULL
    return value
  }
}

/**
 * Common representation for entity data, storing entity attributes
 * as `string` keys and the attribute values as dynamically-typed
 * `Value` objects.
 */
class Entity extends TypedMap<string, Value> {
  setAddress(key: string, value: Address): void {
    this.set(key, Value.fromAddress(value))
  }

  setBoolean(key: string, value: boolean): void {
    this.set(key, Value.fromBoolean(value))
  }

  setBytes(key: string, value: Bytes): void {
    this.set(key, Value.fromBytes(value))
  }

  setH256(key: string, value: H256): void {
    this.set(key, Value.fromH256(value))
  }

  setU32(key: string, value: u32): void {
    this.set(key, Value.fromU32(value))
  }

  setU256(key: string, value: U256): void {
    this.set(key, Value.fromU256(value))
  }

  setString(key: string, value: string): void {
    this.set(key, Value.fromString(value))
  }

  /** Assigns properties from sources to this Entity in right-to-left order */
  merge(sources: Array<Entity>): Entity {
    var target = this
    for (let i = 0; i < sources.length; i++) {
      let entries = sources[i].entries
      for (let j = 0; j < entries.length; j++) {
        target.set(entries[j].key, entries[j].value)
      }
    }
    return target
  }
}

/**
 * Common representation for Ethereum smart contract events.
 */
class EthereumEvent {
  address: Address
  eventSignature: string
  blockHash: H256
  params: Array<EthereumEventParam>
}

/**
 * A dynamically-typed Ethereum event parameter.
 */
class EthereumEventParam {
  name: string
  value: Token
}

class SmartContractCall {
  blockHash: H256
  contractName: string
  contractAddress: Address
  functionName: string
  functionParams: Array<Token>

  constructor(
    blockHash: H256,
    contractName: string,
    contractAddress: Address,
    functionName: string,
    functionParams: Array<Token>
  ) {
    this.blockHash = blockHash
    this.contractName = contractName
    this.contractAddress = contractAddress
    this.functionName = functionName
    this.functionParams = functionParams
  }
}

/**
 * Low-level interaction with Ethereum smart contracts
 */
class SmartContract {
  name: string
  address: Address
  blockHash: H256

  protected constructor(name: string, address: Address, blockHash: H256) {
    this.name = name
    this.address = address
    this.blockHash = blockHash
  }

  call(name: string, params: Array<Token>): Array<Token> {
    let call = new SmartContractCall(
      this.blockHash,
      this.name,
      this.address,
      name,
      params
    )
    return ethereum.call(call)
  }
}
