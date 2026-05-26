# The Graph Protocol Tooling Monorepo

Tools for building and deploying subgraphs on The Graph Network.

## Packages

| Package                    | Description                          | Docs                                             |
| -------------------------- | ------------------------------------ | ------------------------------------------------ |
| `@graphprotocol/graph-cli` | CLI for init, codegen, build, deploy | [packages/cli/CLAUDE.md](packages/cli/CLAUDE.md) |
| `@graphprotocol/graph-ts`  | AssemblyScript library for mappings  | [packages/ts/CLAUDE.md](packages/ts/CLAUDE.md)   |

## Development Setup

```bash
# Requirements: Node.js 20+, pnpm 10
pnpm install
pnpm build
```

## Common Commands

```bash
# Build all packages
pnpm build

# Run tests
pnpm test     # All packages
pnpm test:cli # CLI only
pnpm test:ts  # graph-ts only

# Code quality
pnpm lint       # Check formatting + linting
pnpm lint:fix   # Auto-fix issues
pnpm type-check # TypeScript type checking
```

## Code Style

- ESLint with `@theguild/eslint-config`
- Prettier with `@theguild/prettier-config`
- TypeScript strict mode

## Release Process

Uses [Changesets](https://github.com/changesets/changesets) for versioning:

```bash
# Add a changeset for your changes
pnpm changeset

# Release (builds + publishes)
pnpm release
```

## Project Structure

```
├── packages/
│   ├── cli/        # @graphprotocol/graph-cli
│   └── ts/         # @graphprotocol/graph-ts
├── patches/        # pnpm patches for dependencies
└── .changeset/     # Changesets configuration
```
