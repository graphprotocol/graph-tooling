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
  function call(call: SmartContractCall): Array<Value>
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
      if (this.entries[i].key === key) {
        return this.entries[i]
      }
    }
    return null
  }

  get(key: K): V | null {
    for (let i: i32 = 0; i < this.entries.length; i++) {
      if (this.entries[i].key === key) {
        return this.entries[i].value
      }
    }
    return null
  }
}

/** Pointer type */
type pointer = u32

/**
 * An Ethereum address (20 bytes).
 */
type Address = ArrayBuffer

/**
 * A dynamically-sized byte array.
 */
type Bytes = ArrayBuffer

/**
 * A fixed-size (32 bytes) byte array.
 */
type Bytes32 = ArrayBuffer

/**
 * A 256- bit hash.
 */
class H256 {}

/**
 * A signed 256-bit integer.
 */
type I256 = ArrayBuffer

/**
 * An unsigned 256-bit integer.
 */
type U256 = ArrayBuffer

/**
 * Type hint for Ethereum values.
 */
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

// Big enough to fit any pointer or native this.data.
type TokenPayload = u64

/**
 * A dynamically typed value used when accessing Ethereum data.
 */
class Token {
  kind: TokenKind
  data: TokenPayload

  toAddress(): Address {
    assert(this.kind == TokenKind.ADDRESS, 'Token is not an address.')
    return changetype<Address>(this.data as u32)
  }

  toBytes(): Bytes {
    assert(
      this.kind == TokenKind.FIXED_BYTES || this.kind == TokenKind.BYTES,
      'Token is not bytes.'
    )
    return changetype<Bytes>(this.data as u32)
  }

  toI256(token: Token): I256 {
    assert(
      this.kind == TokenKind.INT || token.kind == TokenKind.UINT,
      'Token is not an int or uint.'
    )
    return changetype<I256>(token.data as u32)
  }

  toBool(): boolean {
    assert(this.kind == TokenKind.BOOL, 'Token is not a boolean.')
    return this.data != 0
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
    let token: Token
    token.kind = TokenKind.BYTES
    token.data = address as u64
    return token
  }

  static fromBytes(bytes: Bytes): Token {
    let token: Token
    token.kind = TokenKind.BYTES
    token.data = bytes as u64
    return token
  }

  static fromI256(i: I256): Token {
    let token: Token
    token.kind = TokenKind.INT
    token.data = i as u64
    return token
  }

  static fromBool(b: boolean): Token {
    let token: Token
    token.kind = TokenKind.BOOL
    token.data = b as u64
    return token
  }

  static fromString(s: string): Token {
    let token: Token
    token.kind = TokenKind.STRING
    token.data = s as u64
    return token
  }

  static fromArray(arr: Token): Token {
    let token: Token
    token.kind = TokenKind.ARRAY
    token.data = arr as u64
    return token
  }
}

/**
 * ValueType enum
 */
enum ValueType {
  ADDRESS,
  BOOLEAN,
  U32,
  U256,
  BYTES,
  BYTES32,
  H256,
  STRING,
  ARRAY,
  MAP,
}

/**
 * A dynamically typed value.
 */
class Value {
  kind: ValueType
  data: pointer

  toAddress(): Address {
    throw 'Unsupported'
  }

  toBoolean(): boolean {
    throw 'Unsupported'
  }

  toBytes(): Bytes {
    throw 'Unsupported'
  }

  toBytes32(): Bytes32 {
    throw 'Unsupported'
  }

  toH256(): H256 {
    throw 'Unsupported'
  }

  toU32(): u32 {
    throw 'Unsupported'
  }

  toU256(): U256 {
    throw 'Unsupported'
  }

  toString(): string {
    throw 'Unsupported'
  }

  toArray(): Array<Value> {
    throw 'Unsupported'
  }

  toMap(): TypedMap<string, Value> {
    throw 'Unsupported'
  }

  static fromAddress(address: Address): Value {
    throw 'Unsupported'
  }

  static fromBoolean(b: boolean): Value {
    throw 'Unsupported'
  }

  static fromBytes(bytes: Bytes): Value {
    throw 'Unsupported'
  }

  static fromBytes32(bytes: Bytes32): Value {
    throw 'Unsupported'
  }

  static fromH256(h: H256): Value {
    throw 'Unsupported'
  }

  static fromU32(n: u32): Value {
    throw 'Unsupported'
  }

  static fromU256(n: U256): Value {
    throw 'Unsupported'
  }

  static fromString(string: string): Value {
    throw 'Unsupported'
  }

  static fromArray(values: Array<Value>): Value {
    throw 'Unsupported'
  }

  static fromMap(m: TypedMap<string, Value>): Value {
    throw 'Unsupported'
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

  setBytes32(key: string, value: Bytes32): void {
    this.set(key, Value.fromBytes32(value))
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

  setArray(key: string, value: Array<Value>): void {
    this.set(key, Value.fromArray(value))
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
  functionParams: Array<Value>

  constructor(
    blockHash: H256,
    contractName: string,
    contractAddress: Address,
    functionName: string,
    functionParams: Array<Value>
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

  bind(name: string, address: Address, blockHash: H256): void {
    this.name = name
    this.address = address
    this.blockHash = blockHash
  }

  call(name: string, params: Array<Value>): Array<Value> {
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
