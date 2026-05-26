# @graphprotocol/graph-cli

CLI for building and deploying subgraphs to The Graph Network.

## Architecture

Built on [oclif](https://oclif.io/) command framework. Entry point: `bin/run.js` -> `dist/commands/`.

## gnd dispatch

By default, `graph <cmd>` execs `gnd <cmd>` (the Rust `@graphprotocol/gnd`
binary). Exceptions:

- `graph local` always runs the TypeScript implementation — gnd has no
  equivalent command.
- `graph dev` is an oclif shim that spawns `gnd dev`, so the command is
  discoverable from `graph --help` even when running in TS mode.

Set `GRAPH_CLI_IGNORE_GND=1` to force every command through the oclif/TS
implementation. The test suite sets this automatically via
`tests/cli/globalSetup.ts`.

The dispatch lives in `bin/run.js` and shares the spawn helper in
`src/command-helpers/gnd.ts` with `src/commands/dev.ts`.

## Key Directories

```
src/
├── commands/         # 13 CLI commands (init, build, codegen, deploy, test, etc.)
├── protocols/        # Multi-chain support (ethereum, near, cosmos, arweave, substreams)
├── scaffold/         # Code generation for new subgraphs
├── codegen/          # Type generation from ABIs and GraphQL schemas
├── validation/       # Manifest and schema validation
├── command-helpers/  # Shared utilities across commands
├── compiler/         # WASM compilation orchestration
└── migrations/       # Manifest version migrations
```

## Commands

| Command   | Description                                                 |
| --------- | ----------------------------------------------------------- |
| `init`    | Scaffold a new subgraph                                     |
| `codegen` | Generate AssemblyScript types from schema/ABIs              |
| `build`   | Compile subgraph to WASM                                    |
| `deploy`  | Deploy to hosted service or decentralized network           |
| `test`    | Run matchstick tests                                        |
| `create`  | Create subgraph name on node                                |
| `publish` | Publish to The Graph Network                                |
| `add`     | Add data source to manifest                                 |
| `remove`  | Remove data source from manifest                            |
| `auth`    | Set deploy key                                              |
| `local`   | Manage local Graph Node (always TS — gnd has no equivalent) |
| `dev`     | Run graph-node in dev mode (delegates to `gnd dev`)         |
| `clean`   | Remove build artifacts                                      |

## Protocol System

Factory pattern for multi-chain support (`src/protocols/index.ts`):

```typescript
import Protocol from './protocols/index.js'

const protocol = Protocol.fromDataSources(dataSources)
const manifest = protocol.getManifest()
```

Each protocol provides:

- ABI handling and type generation
- Manifest schema and validation
- Scaffolding templates
- Chain-specific codegen

## Scaffolding

Templates in `src/scaffold/` generate:

- `subgraph.yaml` manifest
- `schema.graphql` entity definitions
- `src/mapping.ts` event handlers
- Test files

```typescript
import Scaffold from './scaffold/index.js'

const scaffold = new Scaffold({
  protocol,
  network,
  contractName
  // ...
})
await scaffold.generate()
```

## Type Generation

`src/type-generator.ts` creates AssemblyScript classes from:

- GraphQL schema -> Entity classes
- Contract ABIs -> Event/Call types

## Development

```bash
pnpm build      # Compile TypeScript + generate oclif manifest
pnpm test       # Run vitest tests
pnpm type-check # TypeScript type checking
```

### Testing

Uses Vitest with snapshot tests in `tests/`. Key test files:

- `tests/cli/init.test.ts` - Scaffolding tests
- `tests/cli/validation.test.ts` - Manifest validation
- `tests/cli/add.test.ts` - Data source addition

Run specific tests:

```bash
pnpm test:init
pnpm test:validation
```

## Key Patterns

### Command Structure

```typescript
import { Command, Flags } from '@oclif/core'

export default class MyCommand extends Command {
  static flags = {
    network: Flags.string({ description: 'Network name' })
  }

  async run() {
    const { flags } = await this.parse(MyCommand)
    // ...
  }
}
```

### Subgraph Manifest Loading

```typescript
import Subgraph from './subgraph.js'

const subgraph = await Subgraph.load('subgraph.yaml')
const dataSources = subgraph.get('dataSources')
```

## Related

- [packages/ts/CLAUDE.md](../ts/CLAUDE.md) - AssemblyScript library for mappings
