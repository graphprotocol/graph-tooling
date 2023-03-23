import { BigInt, cosmos } from "@graphprotocol/graph-ts";
import { Block } from "../generated/schema";

export function handleBlock(bl: cosmos.Block): void {
  const hash = bl.header.hash.toHexString();
  const height = BigInt.fromString(bl.header.height.toString());

  const block = new Block(hash);

  block.number = height;
  block.timestamp = BigInt.fromString(bl.header.time.seconds.toString());

  block.save();
}
