const generatePlaceholderHandlers = () =>
  `
  import { arweave, BigInt } from '@graphprotocol/graph-ts'
  import { Block, Transaction } from '../generated/schema'

  export function handleBlock(block: arweave.Block): void {
    // Entities can be loaded from the store using a indepHash; this indepHash
    // needs to be unique across all entities of the same type
    let entity = Block.load(block.indepHash.toHexString())

    // Entities only exist after they have been saved to the store;
    // \`null\` checks allow to create entities on demand
    if (!entity) {
      entity = new Block(block.indepHash.toHexString());

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

  export function handleTx(tb: arweave.TransactionWithBlockPtr): void {
    const tx = tb.tx;
    const entity = new Transaction(tx.id.toHexString());

    entity.block = tb.block.indepHash;
    entity.tx_id = tx.id;
    entity.last_tx = tx.lastTx;
    entity.owner = tx.owner;
    entity.tags = saveTags(tx.id.toHexString(), tx.tags);
    entity.data = tx.data;
    entity.data_root = tx.dataRoot;
    entity.data_size = tx.dataSize;
    entity.target = tx.target;
    entity.quantity = tx.quantity;
    entity.signature = tx.signature;
    entity.reward = tx.reward;

    entity.save();
  }
`

module.exports = {
  generatePlaceholderHandlers,
}
