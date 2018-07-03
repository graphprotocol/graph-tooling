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
