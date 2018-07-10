class RegistryEntryEvent extends EthereumEvent {
  get registryEntry(): Address {
    return this.params[0].value.toAddress();
  }

  get eventType(): Bytes {
    return this.params[1].value.toBytes();
  }

  get version(): U256 {
    return this.params[2].value.toU256();
  }

  get timestamp(): U256 {
    return this.params[3].value.toU256();
  }

  get data(): Array<U256> {
    return this.params[4].value.toArray();
  }
}

class LogSetAuthority extends EthereumEvent {
  get authority(): Address {
    return this.params[0].value.toAddress();
  }
}

class LogSetOwner extends EthereumEvent {
  get owner(): Address {
    return this.params[0].value.toAddress();
  }
}

class MemeRegistry extends SmartContract {
  static bind(address: Address, blockHash: H256): MemeRegistry {
    return new MemeRegistry("MemeRegistry", address, blockHash);
  }

  isFactory(factory: Address): bool {
    let __result = super.call("isFactory", [Token.fromAddress(factory)]);
    return __result[0].toBoolean();
  }

  db(): Address {
    let __result = super.call("db", []);
    return __result[0].toAddress();
  }

  isEmergency(): bool {
    let __result = super.call("isEmergency", []);
    return __result[0].toBoolean();
  }

  isRegistryEntry(registryEntry: Address): bool {
    let __result = super.call("isRegistryEntry", [
      Token.fromAddress(registryEntry)
    ]);
    return __result[0].toBoolean();
  }

  owner(): Address {
    let __result = super.call("owner", []);
    return __result[0].toAddress();
  }

  authority(): Address {
    let __result = super.call("authority", []);
    return __result[0].toAddress();
  }

  target(): Address {
    let __result = super.call("target", []);
    return __result[0].toAddress();
  }
}
