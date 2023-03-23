import { Protobuf, Reader } from "as-proto";

export function decodeMsgDelegate(a: Uint8Array): MsgDelegate {
  return Protobuf.decode<MsgDelegate>(a, MsgDelegate.decode);
}

export class MsgDelegate {
  static decode(reader: Reader, length: i32): MsgDelegate {
    const end: usize = length < 0 ? reader.end : reader.ptr + length;
    const message = new MsgDelegate();

    while (reader.ptr < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.delegator_address = reader.string();
          break;

        case 2:
          message.validator_address = reader.string();
          break;

        case 3:
          message.amount = MsgCoin.decode(reader, reader.uint32());
          break;

        default:
          reader.skipType(tag & 7);
          break;
      }
    }

    return message;
  }

  delegator_address: string;
  validator_address: string;
  amount: MsgCoin | null;

  constructor(delegator_address: string = "", validator_address: string = "", amount: MsgCoin | null = null) {
    this.delegator_address = delegator_address;
    this.validator_address = validator_address;
    this.amount = amount;
  }
}

export class MsgCoin {
  static decode(reader: Reader, length: i32): MsgCoin {
    const end: usize = length < 0 ? reader.end : reader.ptr + length;
    const message = new MsgCoin();

    while (reader.ptr < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.denom = reader.string();
          break;

        case 2:
          message.amount = reader.string();
          break;

        default:
          reader.skipType(tag & 7);
          break;
      }
    }

    return message;
  }

  denom: string;
  amount: string;

  constructor(denom: string = "", amount: string = "") {
    this.denom = denom;
    this.amount = amount;
  }
}
