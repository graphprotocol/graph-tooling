const ABI = require('../protocols/ethereum/abi')
const immutable = require('immutable')
const Scaffold = require('./')
const Protocol = require('../protocols')

const TEST_EVENT = {
  name: 'ExampleEvent',
  type: 'event',
  inputs: [
    { name: 'a', type: 'uint256', indexed: true },
    { name: 'b', type: 'bytes[4]' },
    { type: 'string' },
    {
      name: 'c',
      type: 'tuple',
      components: [
        { name: 'c1', type: 'uint256' },
        { type: 'bytes32' },
        { type: 'string' },
        {
          name: 'c3',
          type: 'tuple',
          components: [
            { name: 'c31', type: 'uint96' },
            { type: 'string' },
            { type: 'bytes32' },
          ],
        },
      ],
    },
    { name: 'd', type: 'string', indexed: true },
  ],
}

const OVERLOADED_EVENT = {
  name: 'ExampleEvent',
  type: 'event',
  inputs: [{ name: 'a', type: 'bytes32' }],
}

const TEST_CONTRACT = {
  name: 'ExampleContract',
  type: 'contract',
}

const TEST_CALLABLE_FUNCTIONS = [
  {
    name: 'someVariable',
    type: 'function',
    stateMutability: 'view',
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getSomeValue',
    type: 'function',
    stateMutability: 'pure',
    outputs: [{ type: 'tuple', components: [{ type: 'uint256' }] }],
  },
]

const TEST_ABI = new ABI(
  'Contract',
  undefined,
  immutable.fromJS([
    TEST_EVENT,
    OVERLOADED_EVENT,
    TEST_CONTRACT,
    ...TEST_CALLABLE_FUNCTIONS,
  ]),
)

const protocol = new Protocol('ethereum')

const scaffoldOptions = {
  protocol,
  abi: TEST_ABI,
  contract: '0xf87e31492faf9a91b02ee0deaad50d51d56d5d4d',
  network: 'kovan',
  contractName: 'Contract'
}

const scaffold = new Scaffold(scaffoldOptions)

const scaffoldWithIndexEvents = new Scaffold({
  ...scaffoldOptions,
  indexEvents: true,
})

describe('Ethereum subgraph scaffolding', () => {
  test('Manifest', () => {
    expect(
      scaffold.generateManifest(),
    ).toEqual(`\
specVersion: 0.0.1
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum
    name: Contract
    network: kovan
    source:
      address: "0xf87e31492faf9a91b02ee0deaad50d51d56d5d4d"
      abi: Contract
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.5
      language: wasm/assemblyscript
      entities:
        - ExampleEvent
        - ExampleEvent1
      abis:
        - name: Contract
          file: ./abis/Contract.json
      eventHandlers:
        - event: ExampleEvent(indexed uint256,bytes[4],string,(uint256,bytes32,string,(uint96,string,bytes32)),indexed string)
          handler: handleExampleEvent
        - event: ExampleEvent(bytes32)
          handler: handleExampleEvent1
      file: ./src/contract.ts
`)
  })

  test('Schema (default)', () => {
    expect(scaffold.generateSchema()).toEqual(`\
type ExampleEntity @entity {
  id: ID!
  count: BigInt!
  a: BigInt! # uint256
  b: [Bytes]! # bytes[4]
}
`)
  })

  test('Schema (for indexing events)', () => {
    expect(scaffoldWithIndexEvents.generateSchema()).toEqual(`\
type ExampleEvent @entity {
  id: ID!
  a: BigInt! # uint256
  b: [Bytes]! # bytes[4]
  param2: String! # string
  c_c1: BigInt! # uint256
  c_value1: Bytes! # bytes32
  c_value2: String! # string
  c_c3_c31: BigInt! # uint96
  c_c3_value1: String! # string
  c_c3_value2: Bytes! # bytes32
  d: String! # string
}

type ExampleEvent1 @entity {
  id: ID!
  a: Bytes! # bytes32
}
`)
  })

  test('Mapping (default)', () => {
    expect(scaffold.generateMapping()).toEqual(`\
import { BigInt } from "@graphprotocol/graph-ts"
import {
  Contract,
  ExampleEvent,
  ExampleEvent1
} from "../generated/Contract/Contract"
import { ExampleEntity } from "../generated/schema"

export function handleExampleEvent(event: ExampleEvent): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let entity = ExampleEntity.load(event.transaction.from.toHex())

  // Entities only exist after they have been saved to the store;
  // \`null\` checks allow to create entities on demand
  if (!entity) {
    entity = new ExampleEntity(event.transaction.from.toHex())

    // Entity fields can be set using simple assignments
    entity.count = BigInt.fromI32(0)
  }

  // BigInt and BigDecimal math are supported
  entity.count = entity.count + BigInt.fromI32(1)

  // Entity fields can be set based on event parameters
  entity.a = event.params.a
  entity.b = event.params.b

  // Entities can be written to the store with \`.save()\`
  entity.save()

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // \`new Entity(...)\`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.someVariable(...)
  // - contract.getSomeValue(...)
}

export function handleExampleEvent1(event: ExampleEvent1): void {}
`)
  })

  test('Mapping (for indexing events)', () => {
    expect(scaffoldWithIndexEvents.generateMapping()).toEqual(`\
import {
  ExampleEvent as ExampleEventEvent,
  ExampleEvent1 as ExampleEvent1Event
} from "../generated/Contract/Contract"
import { ExampleEvent, ExampleEvent1 } from "../generated/schema"

export function handleExampleEvent(event: ExampleEventEvent): void {
  let entity = new ExampleEvent(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.a = event.params.a
  entity.b = event.params.b
  entity.param2 = event.params.param2
  entity.c_c1 = event.params.c.c1
  entity.c_value1 = event.params.c.value1
  entity.c_value2 = event.params.c.value2
  entity.c_c3_c31 = event.params.c.c3.c31
  entity.c_c3_value1 = event.params.c.c3.value1
  entity.c_c3_value2 = event.params.c.c3.value2
  entity.d = event.params.d
  entity.save()
}

export function handleExampleEvent1(event: ExampleEvent1Event): void {
  let entity = new ExampleEvent1(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.a = event.params.a
  entity.save()
}
`)
  })

  test('Test Files (default)', () => {
    const files = scaffoldWithIndexEvents.generateTests()
    const testFile = files['contract.test.ts']
    const utilsFile = files['contract-utils.ts']
    expect(testFile).toEqual(`\
import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from \"matchstick-as/assembly/index\"
import { BigInt, Bytes } from \"@graphprotocol/graph-ts\"
import { ExampleEvent } from \"../generated/schema\"
import { ExampleEvent as ExampleEventEvent } from \"../generated/Contract/Contract\"
import { handleExampleEvent } from \"../src/contract\"
import { createExampleEventEvent } from \"./contract-utils\"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe(\"Describe entity assertions\", () => {
  beforeAll(() => {
    let a = BigInt.fromI32(234)
    let b = [Bytes.fromI32(1234567890)]
    let param2 = \"Example string value\"
    let c = \"ethereum.Tuple Not implemented\"
    let d = \"Example string value\"
    let newExampleEventEvent = createExampleEventEvent(a, b, param2, c, d)
    handleExampleEvent(newExampleEventEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test(\"ExampleEvent created and stored\", () => {
    assert.entityCount(\"ExampleEvent\", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      \"ExampleEvent\",
      \"0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1\",
      \"a\",
      \"234\"
    )
    assert.fieldEquals(
      \"ExampleEvent\",
      \"0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1\",
      \"b\",
      \"[1234567890]\"
    )
    assert.fieldEquals(
      \"ExampleEvent\",
      \"0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1\",
      \"param2\",
      \"Example string value\"
    )
    assert.fieldEquals(
      \"ExampleEvent\",
      \"0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1\",
      \"c\",
      \"ethereum.Tuple Not implemented\"
    )
    assert.fieldEquals(
      \"ExampleEvent\",
      \"0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1\",
      \"d\",
      \"Example string value\"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
`)
    expect(utilsFile).toEqual(`\
import { newMockEvent } from \"matchstick-as\"
import { ethereum, BigInt, Bytes } from \"@graphprotocol/graph-ts\"
import { ExampleEvent, ExampleEvent1 } from \"../generated/Contract/Contract\"

export function createExampleEventEvent(
  a: BigInt,
  b: Array<Bytes>,
  param2: string,
  c: ethereum.Tuple,
  d: string
): ExampleEvent {
  let exampleEventEvent = changetype<ExampleEvent>(newMockEvent())

  exampleEventEvent.parameters = new Array()

  exampleEventEvent.parameters.push(
    new ethereum.EventParam(\"a\", ethereum.Value.fromUnsignedBigInt(a))
  )
  exampleEventEvent.parameters.push(
    new ethereum.EventParam(\"b\", ethereum.Value.fromBytesArray(b))
  )
  exampleEventEvent.parameters.push(
    new ethereum.EventParam(\"param2\", ethereum.Value.fromString(param2))
  )
  exampleEventEvent.parameters.push(
    new ethereum.EventParam(\"c\", ethereum.Value.fromTuple(c))
  )
  exampleEventEvent.parameters.push(
    new ethereum.EventParam(\"d\", ethereum.Value.fromString(d))
  )

  return exampleEventEvent
}

export function createExampleEvent1Event(a: Bytes): ExampleEvent1 {
  let exampleEvent1Event = changetype<ExampleEvent1>(newMockEvent())

  exampleEvent1Event.parameters = new Array()

  exampleEvent1Event.parameters.push(
    new ethereum.EventParam(\"a\", ethereum.Value.fromFixedBytes(a))
  )

  return exampleEvent1Event
}
`)
  })

  test('Test Files (for indexing events)', () => {
    const files = scaffoldWithIndexEvents.generateTests()
    const testFile = files['contract.test.ts']
    const utilsFile = files['contract-utils.ts']

    expect(testFile).toEqual(`\
import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from \"matchstick-as/assembly/index\"
import { BigInt, Bytes } from \"@graphprotocol/graph-ts\"
import { ExampleEvent } from \"../generated/schema\"
import { ExampleEvent as ExampleEventEvent } from \"../generated/Contract/Contract\"
import { handleExampleEvent } from \"../src/contract\"
import { createExampleEventEvent } from \"./contract-utils\"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe(\"Describe entity assertions\", () => {
  beforeAll(() => {
    let a = BigInt.fromI32(234)
    let b = [Bytes.fromI32(1234567890)]
    let param2 = \"Example string value\"
    let c = \"ethereum.Tuple Not implemented\"
    let d = \"Example string value\"
    let newExampleEventEvent = createExampleEventEvent(a, b, param2, c, d)
    handleExampleEvent(newExampleEventEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test(\"ExampleEvent created and stored\", () => {
    assert.entityCount(\"ExampleEvent\", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      \"ExampleEvent\",
      \"0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1\",
      \"a\",
      \"234\"
    )
    assert.fieldEquals(
      \"ExampleEvent\",
      \"0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1\",
      \"b\",
      \"[1234567890]\"
    )
    assert.fieldEquals(
      \"ExampleEvent\",
      \"0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1\",
      \"param2\",
      \"Example string value\"
    )
    assert.fieldEquals(
      \"ExampleEvent\",
      \"0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1\",
      \"c\",
      \"ethereum.Tuple Not implemented\"
    )
    assert.fieldEquals(
      \"ExampleEvent\",
      \"0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1\",
      \"d\",
      \"Example string value\"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
`)
    expect(utilsFile).toEqual(`\
import { newMockEvent } from \"matchstick-as\"
import { ethereum, BigInt, Bytes } from \"@graphprotocol/graph-ts\"
import { ExampleEvent, ExampleEvent1 } from \"../generated/Contract/Contract\"

export function createExampleEventEvent(
  a: BigInt,
  b: Array<Bytes>,
  param2: string,
  c: ethereum.Tuple,
  d: string
): ExampleEvent {
  let exampleEventEvent = changetype<ExampleEvent>(newMockEvent())

  exampleEventEvent.parameters = new Array()

  exampleEventEvent.parameters.push(
    new ethereum.EventParam(\"a\", ethereum.Value.fromUnsignedBigInt(a))
  )
  exampleEventEvent.parameters.push(
    new ethereum.EventParam(\"b\", ethereum.Value.fromBytesArray(b))
  )
  exampleEventEvent.parameters.push(
    new ethereum.EventParam(\"param2\", ethereum.Value.fromString(param2))
  )
  exampleEventEvent.parameters.push(
    new ethereum.EventParam(\"c\", ethereum.Value.fromTuple(c))
  )
  exampleEventEvent.parameters.push(
    new ethereum.EventParam(\"d\", ethereum.Value.fromString(d))
  )

  return exampleEventEvent
}

export function createExampleEvent1Event(a: Bytes): ExampleEvent1 {
  let exampleEvent1Event = changetype<ExampleEvent1>(newMockEvent())

  exampleEvent1Event.parameters = new Array()

  exampleEvent1Event.parameters.push(
    new ethereum.EventParam(\"a\", ethereum.Value.fromFixedBytes(a))
  )

  return exampleEvent1Event
}
`)
  })
})
