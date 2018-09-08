/// <reference path="./node_modules/assemblyscript/index.d.ts" />

/**
 * Host store interface
 */
declare namespace store {
  /**
   * Creates or updates an entity in the host store.
   *
   * @param entity Name of the entity type.
   * @param id Entity ID.
   * @param data Entity data.
   */
  function set(entity: string, id: string, data: Entity): void

  /**
   * Removes an entity from the host store.
   *
   * @param entity Name of the entity type.
   * @param id Entity ID.
   */
  function remove(entity: string, id: string): void

  /**
   * Fetches a previously created entity from the host store.
   * 
   * @param entity Name of the entity type.
   * @param id Entity ID.
   */
  function get(entity: string, id: string): Entity
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
declare class Address extends ByteArray {
  fromString(s: String): Address
}

/** An arbitrary size integer. */
declare type BigInt = ByteArray

/** A dynamically-sized byte array. */
declare type Bytes = ByteArray

/** A 160-bit hash. */
declare class H160 extends ByteArray {
  fromString(s: String): H160
}

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
declare enum EthereumValueKind {
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

declare type EthereumValuePayload = u64

/**
 * A dynamically typed value used when accessing Ethereum data.
 */
declare class EthereumValue {
  kind: EthereumValueKind
  data: EthereumValuePayload

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
  toArray(): Array<EthereumValue>
  static fromAddress(address: Address): EthereumValue
  static fromBoolean(b: boolean): EthereumValue
  static fromBytes(bytes: Bytes): EthereumValue
  static fromFixedBytes(bytes: Bytes): EthereumValue
  static fromI8(i: i8): EthereumValue
  static fromI16(i: i16): EthereumValue
  static fromI32(i: i32): EthereumValue
  static fromI64(i: i64): EthereumValue
  static fromI128(i: I128): EthereumValue
  static fromI256(i: I256): EthereumValue
  static fromU8(i: u8): EthereumValue
  static fromU16(i: u16): EthereumValue
  static fromU32(i: u32): EthereumValue
  static fromU64(i: u64): EthereumValue
  static fromU128(i: U128): EthereumValue
  static fromU256(u: U256): EthereumValue
  static fromString(s: string): EthereumValue
  static fromArray(arr: EthereumValue): EthereumValue
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

  toAddress(): Address
  toBoolean(): boolean
  toBigInt(): BigInt
  toBytes(): Bytes
  toU32(): u32
  toString(): string
  toArray(array: Array<Value>): Value

  static fromAddress(address: Address): Value
  static fromBoolean(b: boolean): Value
  static fromBigInt(n: BigInt): Value
  static fromBytes(bytes: Bytes): Value
  static fromI256(i: I256): Value
  static fromU32(n: u32): Value
  static fromU256(n: U256): Value
  static fromString(s: string): Value
  static fromNull(): Value
  static fromArray(array: Array<Value>): Value
}

/**
 * Common representation for entity data, storing entity attributes
 * as `string` keys and the attribute values as dynamically-typed
 * `Value` objects.
 */
declare class Entity extends TypedMap<string, Value> {

  getAddress(key: string): Address
  getBoolean(key: string): boolean
  getBigInt(key: string): BigInt
  getBytes(key: string): Bytes
  getU32(key: string): u32
  getString(key: string): string
  getArray(key: string): Array<Value>

  setAddress(key: string, value: Address): void
  setBoolean(key: string, value: boolean): void
  setBigInt(key: string, value: BigInt): void
  setBytes(key: string, value: Bytes): void
  setI256(key: string, value: I256): void
  setU32(key: string, value: u32): void
  setU256(key: string, value: U256): void
  setString(key: string, value: string): void
  setArray(key: string, array: Array<Value>): void
  unset(key: string): void
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
  parameters: Array<EthereumEventParam>
}

/**
 * A dynamically-typed Ethereum event parameter.
 */
declare interface EthereumEventParam {
  name: string
  value: EthereumValue
}

/** Type hint for JSON values. */
declare enum JSONValueKind {
  NULL,
  BOOL,
  NUMBER,
  STRING,
  ARRAY,
  OBJECT,
}

/**
 * Pointer type for JSONValue data.
 *
 * Big enough to fit any pointer or native `this.data`.
 */
declare type JSONValuePayload = u64

/**
 * JSON value.
 */
declare class JSONValue {
  isNull(): boolean
  toBool(): boolean
  toI64(): i64
  toU64(): u64
  toF64(): f64
  toBigInt(): BigInt
  toString(): string
  toArray(): Array<JSONValue>
  toObject(): TypedMap<string, JSONValue>
}
