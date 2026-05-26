# @graphprotocol/graph-ts

AssemblyScript library for writing subgraph mappings. Imported by generated mapping code.

## Architecture

This library provides types and host interfaces that compile to WASM and run in graph-node. Uses AssemblyScript (TypeScript-like syntax targeting WebAssembly).

## Key Directories

```
├── chain/          # Blockchain-specific types
│   ├── ethereum.ts # Ethereum blocks, transactions, events, calls
│   ├── near.ts     # NEAR receipts, actions
│   ├── cosmos.ts   # Cosmos events, transactions
│   ├── arweave.ts  # Arweave blocks, transactions
│   └── starknet.ts # Starknet events, transactions
├── common/         # Core types
│   ├── numbers.ts  # BigInt, BigDecimal, Address
│   ├── collections.ts # ByteArray, Bytes, Entity, TypedMap
│   ├── value.ts    # Value union type for store operations
│   ├── json.ts     # JSON parsing
│   └── datasource.ts # Dynamic data source creation
├── global/         # TypeId enum for WASM runtime
└── index.ts        # Re-exports + host namespace declarations
```

## Core Types

```typescript
import { Address, BigDecimal, BigInt, Bytes, Entity } from '@graphprotocol/graph-ts'

// Number types
let amount = BigInt.fromI32(100)
let price = BigDecimal.fromString('1.5')

// Address (20 bytes)
let addr = Address.fromString('0x...')

// Binary data
let data = Bytes.fromHexString('0xabcd')
```

## Host Interfaces

Declared as namespaces that map to graph-node host functions:

```typescript
// Entity storage
store.get(entity, id)
store.set(entity, id, data)
store.remove(entity, id)

// Logging
log.info('Value: {}', [value.toString()])
log.warning('Issue: {}', [msg])
log.error('Failed: {}', [err])

// IPFS access
ipfs.cat(hash)

// Cryptography
crypto.keccak256(input)

// ENS lookups
ens.nameByHash(hash)
```

## Entity Pattern

Entities implement the `Entity` interface for store operations:

```typescript
class Transfer extends Entity {
  constructor(id: string) {
    super()
    this.set('id', Value.fromString(id))
  }

  save(): void {
    store.set('Transfer', this.get('id')!.toString(), this)
  }

  static load(id: string): Transfer | null {
    return changetype<Transfer | null>(store.get('Transfer', id))
  }
}
```

## Ethereum Types

```typescript
import { ethereum } from '@graphprotocol/graph-ts'

// In event handler
export function handleTransfer(event: ethereum.Event): void {
  let block = event.block // ethereum.Block
  let tx = event.transaction // ethereum.Transaction
  let receipt = event.receipt // ethereum.TransactionReceipt | null
  let logIndex = event.logIndex // BigInt
}

// Contract calls
let result = contract.try_balanceOf(address)
if (!result.reverted) {
  let balance = result.value
}
```

## Build

Compiles to WASM via AssemblyScript:

```bash
pnpm build # Outputs index.wasm
pnpm test  # Run tests
```

## Relationship to CLI

The `@graphprotocol/graph-cli` package generates code that imports from this library:

- `graph codegen` generates entity classes extending `Entity`
- `graph build` compiles mappings + this library to WASM

## Key Patterns

### Result Type for Contract Calls

```typescript
// Generated code uses ethereum.CallResult<T>
let result = contract.try_someFunction()
if (result.reverted) {
  log.warning('Call reverted', [])
} else {
  let value = result.value
}
```

### Dynamic Data Sources

```typescript
import { DataSourceTemplate } from '@graphprotocol/graph-ts'

// Create new data source at runtime
DataSourceTemplate.create('TokenTemplate', [tokenAddress.toHexString()])
```

## Related

- [packages/cli/CLAUDE.md](../cli/CLAUDE.md) - CLI for building and deploying subgraphs
