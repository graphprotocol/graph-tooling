// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.

import {
  ethereum,
  JSONValue,
  TypedMap,
  Entity,
  Bytes,
  Address,
  BigInt
} from "@graphprotocol/graph-ts";

export class ExampleContract extends ethereum.SmartContract {
  static bind(address: Address): ExampleContract {
    return new ExampleContract("ExampleContract", address);
  }
}

export class DoSomethingCall extends ethereum.Call {
  get inputs(): DoSomethingCall__Inputs {
    return new DoSomethingCall__Inputs(this);
  }

  get outputs(): DoSomethingCall__Outputs {
    return new DoSomethingCall__Outputs(this);
  }
}

export class DoSomethingCall__Inputs {
  _call: DoSomethingCall;

  constructor(call: DoSomethingCall) {
    this._call = call;
  }

  get value0(): BigInt {
    return this._call.inputValues[0].value.toBigInt();
  }

  get value1(): DoSomethingCallValue1Struct {
    return changetype<DoSomethingCallValue1Struct>(
      this._call.inputValues[1].value.toTuple()
    );
  }

  get value2(): boolean {
    return this._call.inputValues[2].value.toBoolean();
  }
}

export class DoSomethingCall__Outputs {
  _call: DoSomethingCall;

  constructor(call: DoSomethingCall) {
    this._call = call;
  }
}

export class DoSomethingCallValue1Struct extends ethereum.Tuple {
  get value0(): Bytes {
    return this[0].toBytes();
  }

  get value1(): Bytes {
    return this[1].toBytes();
  }

  get value2(): BigInt {
    return this[2].toBigInt();
  }
}
