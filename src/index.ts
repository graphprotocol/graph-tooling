import 'allocator/tlsf'

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
 * An Ethereum address (20 bytes).
 */
class Address {
  toString(): string {
    throw 'Unsupported'
  }
}

/**
 * An unsigned 256-bit integer.
 */
class U256 {}

/**
 * A 256- bit hash.
 */
class H256 {}

/**
 * A dynamically-sized byte array.
 */
class Bytes {}

/**
 * A fixed-size (32 bytes) byte array.
 */
class Bytes32 {}

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
 * A dynamically typed value.
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
 * Common representation for entity data, storing entity attributes
 * as `string` keys and the attribute values as dynamically-typed
 * `Value` objects.
 */
class Entity extends TypedMap<string, Value> {}

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
  value: Value
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
