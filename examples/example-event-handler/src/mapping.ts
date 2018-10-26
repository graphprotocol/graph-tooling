import 'allocator/arena'
export { allocate_memory }

import { store, crypto, Entity, Address, BigInt, Bytes } from '@graphprotocol/graph-ts'
import { ExampleContract, ExampleEvent } from './types/ExampleSubgraph/ExampleContract'
import { ExampleEntity } from './types/schema'

export function handleExampleEventArray(event: ExampleEvent): void {
  let entity = new ExampleEntity()

  // Entity field access

  entity.optionalBoolean = true
  entity.optionalBoolean = false
  entity.optionalBooleanList = [true, false]
  entity.optionalBooleanList = null

  let optionalBoolean: boolean = entity.optionalBoolean
  let optionalBooleanList: Array<boolean> | null = entity.optionalBooleanList

  entity.requiredBoolean = true
  entity.requiredBoolean = false
  entity.requiredBooleanList = [true, false]

  let requiredBoolean: boolean = entity.requiredBoolean
  let requiredBooleanList: Array<boolean> = entity.requiredBooleanList

  entity.optionalString = 'hello'
  entity.optionalString = null
  entity.optionalStringList = ['hello', 'world']
  entity.optionalStringList = null

  let optionalString: string | null = entity.optionalString
  let optionalStringList: Array<string> | null = entity.optionalStringList

  entity.requiredString = 'hello'
  entity.requiredStringList = ['hello', 'world']

  let requiredString: string = entity.requiredString
  let requiredStringList: Array<string> = entity.requiredStringList

  entity.optionalInt = 128
  entity.optionalInt = -500
  entity.optionalInt = null
  entity.optionalIntList = [128, -500]
  entity.optionalIntList = null

  let optionalInt: i32 | null = entity.optionalInt
  let optionalIntList: Array<i32> | null = entity.optionalIntList

  entity.requiredInt = 128
  entity.requiredInt = -500
  entity.requiredIntList = [128, -500]

  let requiredInt: i32 = entity.requiredInt
  let requiredIntList: Array<i32> = entity.requiredIntList

  entity.optionalBigInt = new BigInt()
  entity.optionalBigInt = null
  entity.optionalBigIntList = [new BigInt(), new BigInt()]
  entity.optionalBigIntList = null

  let optionalBigInt: BigInt | null = entity.optionalBigInt
  let optionalBigIntList: Array<BigInt> | null = entity.optionalBigIntList

  entity.requiredBigInt = new BigInt()
  entity.requiredBigIntList = [new BigInt(), new BigInt()]

  let requiredBigInt: BigInt = entity.requiredBigInt
  let requiredBigIntList: Array<BigInt> = entity.requiredBigIntList

  entity.optionalBytes = new Bytes()
  entity.optionalBytes = null
  entity.optionalBytesList = [new Bytes(), new Bytes()]
  entity.optionalBytesList = null

  let optionalBytes: Bytes | null = entity.optionalBytes
  let optionalBytesList: Array<Bytes> | null = entity.optionalBytesList

  entity.requiredBytes = new Bytes()
  entity.requiredBytesList = [new Bytes(), new Bytes()]

  let requiredBytes: Bytes = entity.requiredBytes
  let requiredBytesList: Array<Bytes> = entity.requiredBytesList

  entity.optionalReference = 'some-id'
  entity.optionalReference = null
  entity.optionalReferenceList = ['some-id', 'other-id']
  entity.optionalReferenceList = null

  let optionalReference: string | null = entity.optionalReference
  let optionalReferenceList: Array<string> | null = entity.optionalReferenceList

  entity.requiredReference = 'some-id'
  entity.requiredReferenceList = ['some-id', 'other-id']

  let requiredReference: string = entity.requiredReference
  let requiredReferenceList: Array<string> = entity.requiredReferenceList

  // Smart contract calls

  let contract = ExampleContract.bind(event.address)
  entity.requiredBytes = contract.getAndReturnAddress(entity.requiredBytes as Address)
  entity.requiredString = contract.getAndReturnString(entity.requiredString)
  entity.requiredBoolean = contract.getAndReturnBool(entity.requiredBoolean)
  entity.requiredBytes = contract.getAndReturnByte(entity.requiredBytes)
  entity.requiredBytes = contract.getAndReturnBytes1(entity.requiredBytes)
  entity.requiredBytes = contract.getAndReturnBytes32(entity.requiredBytes)
  entity.requiredInt = contract.getAndReturnInt8(entity.requiredInt)
  entity.requiredInt = contract.getAndReturnInt16(entity.requiredInt)
  entity.requiredInt = contract.getAndReturnInt24(entity.requiredInt)
  entity.requiredInt = contract.getAndReturnInt32(entity.requiredInt)
  entity.requiredBigInt = contract.getAndReturnInt40(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnInt56(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnInt64(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnInt72(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnInt80(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnInt88(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnInt96(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnInt104(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnInt112(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnInt120(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnInt128(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnInt136(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnInt144(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnInt152(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnInt160(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnInt168(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnInt176(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnInt184(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnInt192(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnInt200(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnInt200(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnInt208(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnInt216(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnInt224(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnInt232(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnInt240(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnInt248(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnInt256(entity.requiredBigInt)
  entity.requiredInt = contract.getAndReturnUint8(entity.requiredInt)
  entity.requiredInt = contract.getAndReturnUint16(entity.requiredInt)
  entity.requiredInt = contract.getAndReturnUint24(entity.requiredInt)
  entity.requiredInt = contract.getAndReturnUint32(entity.requiredInt)
  entity.requiredBigInt = contract.getAndReturnUint40(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnUint56(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnUint64(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnUint72(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnUint80(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnUint88(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnUint96(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnUint104(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnUint112(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnUint120(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnUint128(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnUint136(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnUint144(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnUint152(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnUint160(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnUint168(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnUint176(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnUint184(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnUint192(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnUint200(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnUint200(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnUint208(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnUint216(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnUint224(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnUint232(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnUint240(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnUint248(entity.requiredBigInt)
  entity.requiredBigInt = contract.getAndReturnUint256(entity.requiredBigInt)

  let addrArray: Array<Address> = contract.getAndReturnAddressArray([
    new Address(),
    new Address(),
  ])
  entity.requiredStringList = contract.getAndReturnStringArray(entity.requiredStringList)
  entity.requiredBooleanList = contract.getAndReturnBoolArray(entity.requiredBooleanList)
  entity.requiredBytesList = contract.getAndReturnByteArray(entity.requiredBytesList)
  entity.requiredBytesList = contract.getAndReturnBytes1Array(entity.requiredBytesList)
  entity.requiredBytesList = contract.getAndReturnBytes32Array(entity.requiredBytesList)
  entity.requiredIntList = contract.getAndReturnInt8Array(entity.requiredIntList)
  entity.requiredIntList = contract.getAndReturnInt16Array(entity.requiredIntList)
  entity.requiredIntList = contract.getAndReturnInt24Array(entity.requiredIntList)
  contract.getAndReturnInt32Array(entity.requiredIntList)
  entity.requiredBigIntList = contract.getAndReturnInt40Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnInt56Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnInt64Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnInt72Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnInt80Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnInt88Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnInt96Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnInt104Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnInt112Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnInt120Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnInt128Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnInt136Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnInt144Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnInt152Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnInt160Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnInt168Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnInt176Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnInt184Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnInt192Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnInt200Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnInt200Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnInt208Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnInt216Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnInt224Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnInt232Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnInt240Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnInt248Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnInt256Array(entity.requiredBigIntList)
  let u8Array: Array<u32> = contract.getAndReturnUint8Array([1 as u32, 100 as u32])
  let u16Array: Array<u32> = contract.getAndReturnUint16Array([1 as u32, 100 as u32])
  let u24Array: Array<u32> = contract.getAndReturnUint24Array([1 as u32, 100 as u32])
  let u32Array: Array<u32> = contract.getAndReturnUint32Array([1 as u32, 100 as u32])
  entity.requiredBigIntList = contract.getAndReturnUint40Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnUint56Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnUint64Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnUint72Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnUint80Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnUint88Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnUint96Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnUint104Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnUint112Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnUint120Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnUint128Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnUint136Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnUint144Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnUint152Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnUint160Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnUint168Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnUint176Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnUint184Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnUint192Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnUint200Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnUint200Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnUint208Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnUint216Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnUint224Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnUint232Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnUint240Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnUint248Array(entity.requiredBigIntList)
  entity.requiredBigIntList = contract.getAndReturnUint256Array(entity.requiredBigIntList)

  // Store access

  store.set('ExampleEntity', 'example id', entity)
  store.get('ExampleEntity', 'example id')
  store.remove('ExampleEntity', 'example id')
}
