class ExampleEvent extends EthereumEvent {
  get params(): ExampleEventParams {
    return new ExampleEventParams(this);
  }
}

class ExampleEventParams {
  _event: ExampleEvent;

  constructor(event: ExampleEvent) {
    this._event = event;
  }

  get exampleParam(): string {
    return this._event.parameters[0].value.toString();
  }
}

class ExampleContract extends SmartContract {
  static bind(address: Address): ExampleContract {
    return new ExampleContract("ExampleContract", address);
  }
}
