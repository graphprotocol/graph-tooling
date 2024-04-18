import {
  PunkBought as PunkBoughtEvent
} from "../generated/CryptoPunks/CryptoPunks";
import {
  PunkBought
} from "../generated/schema";

export function handlePunkBought(event: PunkBoughtEvent): void {
  let entity = new PunkBought("dummy-id");
  entity.punkIndex = event.params.punkIndex;
  entity.value = event.params.value;
  entity.fromAddress = event.params.fromAddress;
  entity.toAddress = event.params.toAddress;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}
