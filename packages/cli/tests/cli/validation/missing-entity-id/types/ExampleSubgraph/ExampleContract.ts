import {
  EthereumEvent,
  SmartContract,
  EthereumValue,
  JSONValue,
  TypedMap,
  Entity,
  Bytes,
  Address,
  BigInt
} from "@graphprotocol/graph-ts";

export class ExampleEvent extends EthereumEvent {
  get params(): ExampleEventParams {
    return new ExampleEventParams(this);
  }
}

export class ExampleEventParams {
  _event: ExampleEvent;

  constructor(event: ExampleEvent) {
    this._event = event;
  }

  get param0(): string {
    return this._event.parameters[0].value.toString();
  }
}

export class ExampleContract extends SmartContract {
  static bind(address: Address): ExampleContract {
    return new ExampleContract("ExampleContract", address);
  }
}
