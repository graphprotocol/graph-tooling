import { near, BigInt, log } from "@graphprotocol/graph-ts";
import { Greeter, Greeting } from "../generated/schema";

export function handleReceipt(receipt: near.ReceiptWithOutcome): void {
  const actions = receipt.receipt.actions;
  for (let i = 0; i < actions.length; i++) {
    handleAction(actions[i], receipt.receipt, receipt.block.header);
  }
}

function handleAction(
  action: near.ActionValue,
  receipt: near.ActionReceipt,
  blockHeader: near.BlockHeader
): void {
  if (action.kind != near.ActionKind.FUNCTION_CALL) {
    log.info("Early return: {}", ["Not a function call"]);
    return;
  }

  const functionCall = action.toFunctionCall();
  if (functionCall.methodName == "sayGm") {
    let greeter = Greeter.load(receipt.signerId);
    if (greeter == null) {
      greeter = new Greeter(receipt.signerId);
      greeter.name = receipt.signerId;
      greeter.save();
    }

    const greeting = new Greeting(receipt.id.toBase58());
    greeting.greeter = greeter.id;
    greeting.timestamp = BigInt.fromU64(blockHeader.timestampNanosec);
    greeting.save();
  } else {
    log.info("Not processed - FunctionCall is: {}", [functionCall.methodName]);
  }
}
