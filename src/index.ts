import 'allocator/tlsf'

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
type pointer = i32

/**
 * Basic Ethereum types
 */

class Address {}
class U256 {}
class Bytes {}
class H256 {}

/**
 * Generic, dynamically typed value
 */
class Value {
  kind: string
  data: pointer

  toAddress(): Address {
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

  static fromU256(u256: U256): Value {
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
class db {
  constructor() {}

  add(entity: string, data: Entity): void {}
  update(entity: string, data: Entity): void {}
  remove(entity: string, id: string): void {}
}

/**
 * Low-level interaction with Ethereum smart contracts
 */
class SmartContract {
  bind(name: string, address: Address): void {}

  call(name: string, params: Array<Value>): Array<Value> {
    return null
  }
}

/**
 * Contextual information passed to Ethereum event handlers
 */
class EventHandlerContext {
  db: db

  constructor(db: db) {
    this.db = db
  }
}
