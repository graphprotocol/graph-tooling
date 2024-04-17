import { BigInt, Bytes, log } from '@graphprotocol/graph-ts';
import * as assembly from "./pb/assembly"
import { BlockEvent } from '../generated/schema';

export function handleBlock(blockBytes: Uint8Array): void {
  const decoded = assembly.receipts.v1.BlockAndReceipts.decode(blockBytes.buffer);
  const block = decoded.block;

  if (block == null) {
    log.info("null block", []);
    return;
  }

  const header = block.header;

  let event = new BlockEvent("0x".concat(header.hash.bytes.toString()));
  event.number = BigInt.fromI32(header.height as i32);
  event.hash = Bytes.fromUint8Array(Uint8Array.wrap(header.hash.encode()));
  event.timestampNanosec = BigInt.fromU64(header.timestamp_nanosec);
  event.gasPrice = BigInt.fromU64(Bytes.fromUint8Array(Uint8Array.wrap(header.gas_price.encode())).toU64());
  event.save();
}
