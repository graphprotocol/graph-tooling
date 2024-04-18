import { newMockEvent } from 'matchstick-as';
import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import {
  Assign,
  PunkBidEntered,
  PunkBidWithdrawn,
  PunkBought,
  PunkNoLongerForSale,
  PunkOffered,
  PunkTransfer,
  Transfer,
} from '../generated/CryptoPunks/CryptoPunks';

export function createAssignEvent(to: Address, punkIndex: BigInt): Assign {
  let assignEvent = changetype<Assign>(newMockEvent());

  assignEvent.parameters = new Array();

  assignEvent.parameters.push(new ethereum.EventParam('to', ethereum.Value.fromAddress(to)));
  assignEvent.parameters.push(
    new ethereum.EventParam('punkIndex', ethereum.Value.fromUnsignedBigInt(punkIndex)),
  );

  return assignEvent;
}

export function createTransferEvent(from: Address, to: Address, value: BigInt): Transfer {
  let transferEvent = changetype<Transfer>(newMockEvent());

  transferEvent.parameters = new Array();

  transferEvent.parameters.push(new ethereum.EventParam('from', ethereum.Value.fromAddress(from)));
  transferEvent.parameters.push(new ethereum.EventParam('to', ethereum.Value.fromAddress(to)));
  transferEvent.parameters.push(
    new ethereum.EventParam('value', ethereum.Value.fromUnsignedBigInt(value)),
  );

  return transferEvent;
}

export function createPunkTransferEvent(
  from: Address,
  to: Address,
  punkIndex: BigInt,
): PunkTransfer {
  let punkTransferEvent = changetype<PunkTransfer>(newMockEvent());

  punkTransferEvent.parameters = new Array();

  punkTransferEvent.parameters.push(
    new ethereum.EventParam('from', ethereum.Value.fromAddress(from)),
  );
  punkTransferEvent.parameters.push(new ethereum.EventParam('to', ethereum.Value.fromAddress(to)));
  punkTransferEvent.parameters.push(
    new ethereum.EventParam('punkIndex', ethereum.Value.fromUnsignedBigInt(punkIndex)),
  );

  return punkTransferEvent;
}

export function createPunkOfferedEvent(
  punkIndex: BigInt,
  minValue: BigInt,
  toAddress: Address,
): PunkOffered {
  let punkOfferedEvent = changetype<PunkOffered>(newMockEvent());

  punkOfferedEvent.parameters = new Array();

  punkOfferedEvent.parameters.push(
    new ethereum.EventParam('punkIndex', ethereum.Value.fromUnsignedBigInt(punkIndex)),
  );
  punkOfferedEvent.parameters.push(
    new ethereum.EventParam('minValue', ethereum.Value.fromUnsignedBigInt(minValue)),
  );
  punkOfferedEvent.parameters.push(
    new ethereum.EventParam('toAddress', ethereum.Value.fromAddress(toAddress)),
  );

  return punkOfferedEvent;
}

export function createPunkBidEnteredEvent(
  punkIndex: BigInt,
  value: BigInt,
  fromAddress: Address,
): PunkBidEntered {
  let punkBidEnteredEvent = changetype<PunkBidEntered>(newMockEvent());

  punkBidEnteredEvent.parameters = new Array();

  punkBidEnteredEvent.parameters.push(
    new ethereum.EventParam('punkIndex', ethereum.Value.fromUnsignedBigInt(punkIndex)),
  );
  punkBidEnteredEvent.parameters.push(
    new ethereum.EventParam('value', ethereum.Value.fromUnsignedBigInt(value)),
  );
  punkBidEnteredEvent.parameters.push(
    new ethereum.EventParam('fromAddress', ethereum.Value.fromAddress(fromAddress)),
  );

  return punkBidEnteredEvent;
}

export function createPunkBidWithdrawnEvent(
  punkIndex: BigInt,
  value: BigInt,
  fromAddress: Address,
): PunkBidWithdrawn {
  let punkBidWithdrawnEvent = changetype<PunkBidWithdrawn>(newMockEvent());

  punkBidWithdrawnEvent.parameters = new Array();

  punkBidWithdrawnEvent.parameters.push(
    new ethereum.EventParam('punkIndex', ethereum.Value.fromUnsignedBigInt(punkIndex)),
  );
  punkBidWithdrawnEvent.parameters.push(
    new ethereum.EventParam('value', ethereum.Value.fromUnsignedBigInt(value)),
  );
  punkBidWithdrawnEvent.parameters.push(
    new ethereum.EventParam('fromAddress', ethereum.Value.fromAddress(fromAddress)),
  );

  return punkBidWithdrawnEvent;
}

export function createPunkBoughtEvent(
  punkIndex: BigInt,
  value: BigInt,
  fromAddress: Address,
  toAddress: Address,
): PunkBought {
  let punkBoughtEvent = changetype<PunkBought>(newMockEvent());

  punkBoughtEvent.parameters = new Array();

  punkBoughtEvent.parameters.push(
    new ethereum.EventParam('punkIndex', ethereum.Value.fromUnsignedBigInt(punkIndex)),
  );
  punkBoughtEvent.parameters.push(
    new ethereum.EventParam('value', ethereum.Value.fromUnsignedBigInt(value)),
  );
  punkBoughtEvent.parameters.push(
    new ethereum.EventParam('fromAddress', ethereum.Value.fromAddress(fromAddress)),
  );
  punkBoughtEvent.parameters.push(
    new ethereum.EventParam('toAddress', ethereum.Value.fromAddress(toAddress)),
  );

  return punkBoughtEvent;
}
