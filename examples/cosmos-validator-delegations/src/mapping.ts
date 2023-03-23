import { cosmos } from "@graphprotocol/graph-ts";
import { MsgDelegate, MsgCoin, decodeMsgDelegate } from "./decoding";
import { Delegation, Coin } from "../generated/schema";

export function handleTx(data: cosmos.TransactionData): void {
  const id = `${data.block.header.hash.toHexString()}-${data.tx.index}`;
  const messages = data.tx.tx.body.messages;

  for (let i = 0; i < messages.length; i++) {
    let msgType = messages[i].typeUrl;
    let msgValue = messages[i].value as Uint8Array;

    if (msgType == "/cosmos.staking.v1beta1.MsgDelegate") {
      saveDelegation(id, decodeMsgDelegate(msgValue)) // The message needs to be decoded to access its attributes.
    }
  }
}

function saveDelegation(id: string, message: MsgDelegate): void {
  const msg = new Delegation(id);

  msg.delegatorAddress = message.delegator_address;
  msg.validatorAddress = message.validator_address;
  msg.amount = saveCoin(id, message.amount as MsgCoin);

  msg.save();
}

function saveCoin(id: string, c: MsgCoin): string {
  const coin = new Coin(id);

  coin.amount = c.amount;
  coin.denom = c.denom;

  coin.save();

  return id;
}
