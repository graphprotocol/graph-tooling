import { ethereum } from '@graphprotocol/graph-ts'
import { ExampleBlockEntity } from './generated/schema'

export function handleBlock(block: ethereum.BlockWithReceipts): void {
  let entity = new ExampleBlockEntity(block.hash.toHexString())
  entity.number = block.number
  entity.hash = block.hash
  entity.save()
}