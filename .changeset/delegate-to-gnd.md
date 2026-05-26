---
'@graphprotocol/graph-cli': major
---

Delegate commands to `gnd` by default

`graph <cmd>` now execs the `@graphprotocol/gnd` binary (shipped as a
dependency) instead of running the bundled TypeScript implementation.
Set `GRAPH_CLI_IGNORE_GND=1` to force every command back through the
oclif/TS code path.

Breaking changes:

- The `graph node install` command has been removed. Install `gnd` via
  the `@graphprotocol/gnd` npm package instead — it is now a direct
  dependency of `@graphprotocol/graph-cli` and no separate download
  step is required.
- `graph local` is the only command that still always runs the
  TypeScript implementation; gnd has no equivalent.
- `graph dev` is an oclif shim that always delegates to `gnd dev`.
