class ExampleContract extends SmartContract {
  static bind(address: Address, blockHash: H256): ExampleContract {
    return new ExampleContract("ExampleContract", address, blockHash);
  }
}
