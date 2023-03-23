import { near, BigInt } from '@graphprotocol/graph-ts';
import { BlockEvent } from '../generated/schema';

export function handleBlock(block: near.Block): void {
  const header = block.header;
  let event = new BlockEvent(header.hash.toHexString());
  event.number = BigInt.fromI32(header.height as i32);
  event.hash = header.hash;
  event.timestampNanosec = BigInt.fromU64(header.timestampNanosec);
  event.gasPrice = header.gasPrice;

  event.save();
}
