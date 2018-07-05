/// <reference path="./node_modules/assemblyscript/std/assembly.d.ts" />

/** Host database interface */
declare namespace database {
  /**
   * Creates an entity in the host database.
   *
   * @param entity Name of the entity type.
   * @param id Entity ID.
   * @param data Entity data.
   */
  function create(entity: string, id: string, data: Entity): void

  /**
   * Updates an entity in the host database.
   *
   * @param entity Name of the entity type.
   * @param id Entity ID.
   * @param data Entity data.
   */
  function update(entity: string, id: string, data: Entity): void

  /**
   * Removes ane entity from the host database.
   *
   * @param entity Name of the entity type.
   * @param id Entity ID.
   */
  function remove(entity: string, id: string): void
}

/**
 * Typed map entry
 */
declare class TypedMapEntry<K, V> {
  key: K
  value: V
}

/**
 * Typed map
 */
declare class TypedMap<K, V> {
  set(key: K, value: V): void
  getEntry(key: K): TypedMapEntry<K, V> | null
  get(key: K): V | null
}

/**
 * Byte array
 */
declare class ByteArray extends Uint8Array {
  toString(hex?: boolean): string
}

/**
 * U64 array
 */
declare class U64Array extends Uint64Array {
  toString(): string
}

/**
 * An Ethereum address (20 bytes).
 */
declare type Address = ByteArray

/**
 * A dynamically-sized byte array.
 */
declare type Bytes = ByteArray

/**
 * A fixed-size (32 bytes) byte array.
 */
declare type Bytes32 = ByteArray

/**
 * A 256- bit hash.
 */
declare type H256 = ByteArray

/**
 * A signed 256-bit integer.
 */
declare type I256 = U64Array

/**
 * An unsigned 256-bit integer.
 */
declare type U256 = U64Array

/**
 * Type hint for Ethereum values.
 */
declare enum TokenKind {
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

declare type TokenPayload = u64

/**
 * A dynamically typed value used when accessing Ethereum data.
 */
declare class Token {
  kind: TokenKind
  data: TokenPayload

  toAddress(): Address
  toBytes(): Bytes
  toI256(): I256
  toU256(): U256
  toBool(): boolean
  toString(hex?: boolean): string
  toArray(): Array<Token>
  static fromAddress(address: Address): Token
  static fromBytes(bytes: Bytes): Token
  static fromI256(i: I256): Token
  static fromU256(u: U256): Token
  static fromBool(b: boolean): Token
  static fromString(s: string): Token
  static fromArray(arr: Token): Token
}

/**
 * Enum for supported value types.
 */
declare enum ValueKind {
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
declare type ValuePayload = u64

/**
 * A dynamically typed value.
 */
declare class Value {
  kind: ValueKind
  data: ValuePayload

  toString(): string
  toBoolean(): boolean
  toAddress(): Address
  toBytes(): Bytes
  toBytes32(): Bytes32
  toH256(): H256
  toU32(): u32
  toU256(): U256
  toArray(): Array<Value>
  toMap(): TypedMap<string, Value>

  static fromAddress(address: Address): Value
  static fromBoolean(b: boolean): Value
  static fromBytes(bytes: Bytes): Value
  static fromH256(h: H256): Value
  static fromU32(n: u32): Value
  static fromU256(n: U256): Value
  static fromString(s: string): Value
  static fromArray(values: Array<Value>): Value
  static fromMap(m: TypedMap<string, Value>): Value
  static fromNull(): Value
}

/**
 * Common representation for entity data, storing entity attributes
 * as `string` keys and the attribute values as dynamically-typed
 * `Value` objects.
 */
declare class Entity extends TypedMap<string, Value> {
  setAddress(key: string, value: Address): void
  setBoolean(key: string, value: boolean): void
  setBytes(key: string, value: Bytes): void
  setBytes32(key: string, value: Bytes32): void
  setH256(key: string, value: H256): void
  setU32(key: string, value: u32): void
  setU256(key: string, value: U256): void
  setString(key: string, value: string): void
  /** Assigns properties from source to this Entity in right-to-left order */
  merge(sources: Array<Entity>): Entity
}

/**
 * Common interface for Ethereum smart contract events.
 */
declare interface EthereumEvent {
  address: Address
  eventSignature: string
  blockHash: H256
  params: Array<EthereumEventParam>
}

/**
 * A dynamically-typed Ethereum event parameter.
 */
declare interface EthereumEventParam {
  name: string
  value: Token
}
