import 'allocator/tlsf'

/** Host db interface */
declare namespace db {
  function create(entity: string, data: Entity): void
  function update(entity: string, data: Entity): void
  function remove(entity: string, id: string): void
}

/** Host ethereum interface */
declare namespace ethereum {
  function call(
    contractName: string,
    contractAddress: Address,
    functionName: string,
    params: Array<Value>
  ): Array<Value>
}

/** Typed map */
class TypedMap<K, V> {
  constructor() {}

  set(key: K, value: V): void {
    throw 'Unsupported'
  }

  get(key: K): V | null {
    throw 'Unsupported'
  }
}

/** Pointer type */
type pointer = u32

/**
 * Basic Ethereum types
 */

class Address {}
class U256 {}
class Bytes {}
class H256 {}

/**
 * ValueType enum
 */
enum ValueType {
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
 * Generic, dynamically typed value
 */
class Value {
  kind: string
  data: pointer

  toAddress(): Address {
    throw 'Unsupported'
  }

  toBoolean(): bool {
    throw 'Unsupported'
  }

  toU32(): u32 {
    throw 'Unsupported'
  }

  toU256(): U256 {
    throw 'Unsupported'
  }

  toBytes(): Bytes {
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

  static fromBool(b: boolean): Value {
    throw 'Unsupported'
  }

  static fromBytes(bytes: Bytes): Value {
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
}

/**
 * Common representation of entity objects
 */
class Entity extends TypedMap<string, Value> {}

/**
 * Ethereum event
 */
class EthereumEvent {
  address: Address
  eventSignature: H256
  blockHash: string
  params: Array<EthereumEventParam>
}

/**
 * Ethereum event parameter
 */
class EthereumEventParam {
  name: string
  value: Value
}

/**
 * State variable request
 */
class StateVariableRequest {
  contractName: string
  contractAddress: Address
  blockHash: H256
  name: string
}

/**
 * Contract function call request
 */
class FunctionCallRequest {
  contractName: string
  contractAddress: Address
  blockHash: H256
  name: string
  params: Array<Value>
}

/**
 * API to push updates to the database of The Graph
 */
class Database {
  constructor() {}

  add(entity: string, data: Entity): void {
    db.create(entity, data)
  }

  update(entity: string, data: Entity): void {
    db.update(entity, data)
  }

  remove(entity: string, id: string): void {
    db.remove(entity, id)
  }
}

/**
 * Low-level interaction with Ethereum smart contracts
 */
class SmartContract {
  name: string
  address: Address

  bind(name: string, address: Address): void {
    this.name = name
    this.address = address
  }

  call(name: string, params: Array<Value>): Array<Value> {
    return ethereum.call(this.name, this.address, name, params)
  }
}

/**
 * Contextual information passed to Ethereum event handlers
 */
class EventHandlerContext {
  db: Database

  constructor(db: Database) {
    this.db = db
  }
}
