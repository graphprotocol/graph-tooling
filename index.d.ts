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
interface TypedMapEntry<K, V> {
  key: K
  value: V
}

/**
 * Typed map
 */
interface TypedMap<K, V> {
  set(key: K, value: V): void
  getEntry(key: K): TypedMapEntry<K, V> | null
  get(key: K): V | null
}

/**
 * An Ethereum address (20 bytes).
 */
interface Address {
  toString(): string
}

/**
 * An unsigned 256-bit integer.
 */
interface U256 {}

/**
 * A 256- bit hash.
 */
interface H256 {}

/**
 * A dynamically-sized byte array.
 */
interface Bytes {}

/**
 * A fixed-size (32 bytes) byte array.
 */
interface Bytes32 {}

/**
 * ValueType enum
 */
declare enum ValueType {
  ADDRESS,
  BOOLEAN,
  U32,
  U256,
  BYTES,
  STRING,
  ARRAY,
  MAP,
}

/**
 * A dynamically typed value.
 */
declare class Value {
  kind: ValueType

  toString(): string
  toBoolean(): bool
  toAddress(): Address
  toBytes(): Bytes
  toBytes32(): Bytes32
  toU32(): u32
  toU256(): U256
  toArray(): Array<Value>
  toMap(): TypedMap<string, Value>

  static fromAddress(address: Address): Value
  static fromBoolean(b: boolean): Value
  static fromBytes(bytes: Bytes): Value
  static fromU32(n: u32): Value
  static fromU256(n: U256): Value
  static fromString(string: string): Value
  static fromArray(values: Array<Value>): Value
}

/**
 * Common representation for entity data, storing entity attributes
 * as `string` keys and the attribute values as dynamically-typed
 * `Value` objects.
 */
declare class Entity extends TypedMap<string, Value> {}

/**
 * Common interface for Ethereum smart contract events.
 */
interface EthereumEvent {
  address: Address
  eventSignature: string
  blockHash: H256
  params: Array<EthereumEventParam>
}

/**
 * A dynamically-typed Ethereum event parameter.
 */
interface EthereumEventParam {
  name: string
  value: Value
}
