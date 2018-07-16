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
  toHex(): string
  toString(): string
}

/**
 * U64 array
 */
declare class U64Array extends Uint64Array {
  toHex(): string
  toString(): string
  toAddress(): Address
  toHash(): H256
}

/** An Ethereum address (20 bytes). */
declare type Address = ByteArray

/** A dynamically-sized byte array. */
declare type Bytes = ByteArray

/** A 160-bit hash. */
declare type H160 = ByteArray

/** A 256-bit hash. */
declare type H256 = ByteArray

/** A signed 128-bit integer. */
declare type I128 = U64Array

/** A signed 256-bit integer. */
declare type I256 = U64Array

/** An unsigned 128-bit integer. */
declare type U128 = U64Array

/** An unsigned 256-bit integer. */
declare type U256 = U64Array

/** Type hint for Ethereum values. */
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
  toBoolean(): boolean
  toBytes(): Bytes
  toI8(): i8
  toI16(): i16
  toI32(): i32
  toI64(): i64
  toI128(): I128
  toI256(): I256
  toU8(): u8
  toU16(): u16
  toU32(): u32
  toU64(): u64
  toU128(): U128
  toU256(): U256
  toU256Array(): Array<U256>
  toString(): string
  toArray(): Array<Token>
  static fromAddress(address: Address): Token
  static fromBoolean(b: boolean): Token
  static fromBytes(bytes: Bytes): Token
  static fromI8(i: i8): Token
  static fromI16(i: i16): Token
  static fromI32(i: i32): Token
  static fromI64(i: i64): Token
  static fromI128(i: I128): Token
  static fromI256(i: I256): Token
  static fromU8(i: u8): Token
  static fromU16(i: u16): Token
  static fromU32(i: u32): Token
  static fromU64(i: u64): Token
  static fromU128(i: U128): Token
  static fromU256(u: U256): Token
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

  static fromAddress(address: Address): Value
  static fromBoolean(b: boolean): Value
  static fromBytes(bytes: Bytes): Value
  static fromH256(h: H256): Value
  static fromU32(n: u32): Value
  static fromU256(n: U256): Value
  static fromString(s: string): Value
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
declare class EthereumEvent {
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
