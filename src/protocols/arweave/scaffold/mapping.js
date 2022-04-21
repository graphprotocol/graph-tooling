const generatePlaceholderHandlers = () =>
  `
  import { arweave, BigInt } from '@graphprotocol/graph-ts'
  import { BlockEvent } from '../generated/schema'

  export function handleReceipt(block: arweave.Block): void {
    // Entities can be loaded from the store using a indepHash; this indepHash
    // needs to be unique across all entities of the same type
    let entity = BlockEvent.load(block.indepHash.toHexString())

    // Entities only exist after they have been saved to the store;
    // \`null\` checks allow to create entities on demand
    if (!entity) {
      entity = new BlockEvent(block.indepHash.toHexString());

      // Entity fields can be set using simple assignments
      entity.height = BigInt.fromU64(block.height)
    }

    // Entities can be written to the store with \`.save()\`
    entity.save()

    // Note: If a handler doesn't require existing field values, it is faster
    // _not_ to load the entity from the store. Instead, create it fresh with
    // \`new Entity(...)\`, set the fields that should be updated and save the
    // entity back to the store. Fields that were not set or unset remain
    // unchanged, allowing for partial updates to be applied.
  }
`

module.exports = {
  generatePlaceholderHandlers,
}
