/// <reference path="./node_modules/assemblyscript/std/assembly.d.ts" />

/**
 * Typed map
 */
declare class TypedMap<K, V> {
  set(key: K, value: V): void
  get(key: K): V | undefined
}

// Basic Ethereum types
interface Address {}
interface U256 {}
interface H256 {}
interface Bytes {}
interface Bytes32 {}

/**
 * Generic, dynamically typed value
 */
declare class Value {
  kind: string
  toString(): string
  toAddress(): Address
  toBytes(): Bytes
  toBytes32(): Bytes32
  toU32(): u32
  toU256(): U256
  toArray(): Array<Value>
  toMap(): TypedMap<string, Value>
  static fromAddress(address: Address): Value
  static fromBytes(bytes: Bytes): Value
  static fromU32(n: u32): Value
  static fromU256(n: U256): Value
  static fromString(string: string): Value
  static fromArray(values: Array<Value>): Value
}

/**
 * Common representation of entity objects
 */
declare class Entity extends TypedMap<string, Value> {}

/**
 * Common interface for Ethereum events
 */
interface EthereumEvent {
  address: Address
  eventSignature: H256
  blockHash: string
  params: Array<EthereumEventParam>
}

/**
 * Ethereum event parameter
 */
interface EthereumEventParam {
  name: string
  value: Value
}

// Interface for pushing entity updates to database of The Graph
interface db {
  add(entity: string, data: Entity): void
  update(entity: string, data: Entity): void
  remove(entity: string, id: string): void
}

// Interface for contextual information passed to event handlers
interface EventHandlerContext {
  db: db
}
