import { Bytes } from '../common/collections';
import { BigInt } from '../common/numbers';

export namespace starknet {
  export class Block {
    constructor(
      public number: BigInt,
      public hash: Bytes,
      public prevHash: Bytes,
      public timestamp: BigInt,
    ) {}
  }

  export class Transaction {
    constructor(
      public type: TransactionType,
      public hash: Bytes,
    ) {}
  }

  export enum TransactionType {
    DEPLOY = 0,
    INVOKE_FUNCTION = 1,
    DECLARE = 2,
    L1_HANDLER = 3,
    DEPLOY_ACCOUNT = 4,
  }

  export class Event {
    constructor(
      public fromAddr: Bytes,
      public keys: Array<Bytes>,
      public data: Array<Bytes>,
      public block: Block,
      public transaction: Transaction,
    ) {}
  }
}
