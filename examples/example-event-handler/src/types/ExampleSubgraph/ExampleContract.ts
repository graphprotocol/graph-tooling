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

  get exampleParam(): string {
    return this._event.parameters[0].value.toString();
  }
}

export class ExampleContract extends SmartContract {
  static bind(address: Address): ExampleContract {
    return new ExampleContract("ExampleContract", address);
  }

  getAndReturnAddress(x: Address): Address {
    let result = super.call("getAndReturnAddress", [
      EthereumValue.fromAddress(x)
    ]);
    return result[0].toAddress();
  }

  getAndReturnString(x: string): string {
    let result = super.call("getAndReturnString", [
      EthereumValue.fromString(x)
    ]);
    return result[0].toString();
  }

  getAndReturnBool(x: boolean): boolean {
    let result = super.call("getAndReturnBool", [EthereumValue.fromBoolean(x)]);
    return result[0].toBoolean();
  }

  getAndReturnByte(x: Bytes): Bytes {
    let result = super.call("getAndReturnByte", [EthereumValue.fromBytes(x)]);
    return result[0].toBytes();
  }

  getAndReturnBytes1(x: Bytes): Bytes {
    let result = super.call("getAndReturnBytes1", [EthereumValue.fromBytes(x)]);
    return result[0].toBytes();
  }

  getAndReturnBytes32(x: Bytes): Bytes {
    let result = super.call("getAndReturnBytes32", [
      EthereumValue.fromBytes(x)
    ]);
    return result[0].toBytes();
  }

  getAndReturnInt8(x: i32): i32 {
    let result = super.call("getAndReturnInt8", [EthereumValue.fromI32(x)]);
    return result[0].toI32();
  }

  getAndReturnInt16(x: i32): i32 {
    let result = super.call("getAndReturnInt16", [EthereumValue.fromI32(x)]);
    return result[0].toI32();
  }

  getAndReturnInt24(x: i32): i32 {
    let result = super.call("getAndReturnInt24", [EthereumValue.fromI32(x)]);
    return result[0].toI32();
  }

  getAndReturnInt32(x: i32): i32 {
    let result = super.call("getAndReturnInt32", [EthereumValue.fromI32(x)]);
    return result[0].toI32();
  }

  getAndReturnInt40(x: BigInt): BigInt {
    let result = super.call("getAndReturnInt40", [
      EthereumValue.fromSignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnInt48(x: BigInt): BigInt {
    let result = super.call("getAndReturnInt48", [
      EthereumValue.fromSignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnInt56(x: BigInt): BigInt {
    let result = super.call("getAndReturnInt56", [
      EthereumValue.fromSignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnInt64(x: BigInt): BigInt {
    let result = super.call("getAndReturnInt64", [
      EthereumValue.fromSignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnInt72(x: BigInt): BigInt {
    let result = super.call("getAndReturnInt72", [
      EthereumValue.fromSignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnInt80(x: BigInt): BigInt {
    let result = super.call("getAndReturnInt80", [
      EthereumValue.fromSignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnInt88(x: BigInt): BigInt {
    let result = super.call("getAndReturnInt88", [
      EthereumValue.fromSignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnInt96(x: BigInt): BigInt {
    let result = super.call("getAndReturnInt96", [
      EthereumValue.fromSignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnInt104(x: BigInt): BigInt {
    let result = super.call("getAndReturnInt104", [
      EthereumValue.fromSignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnInt112(x: BigInt): BigInt {
    let result = super.call("getAndReturnInt112", [
      EthereumValue.fromSignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnInt120(x: BigInt): BigInt {
    let result = super.call("getAndReturnInt120", [
      EthereumValue.fromSignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnInt128(x: BigInt): BigInt {
    let result = super.call("getAndReturnInt128", [
      EthereumValue.fromSignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnInt136(x: BigInt): BigInt {
    let result = super.call("getAndReturnInt136", [
      EthereumValue.fromSignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnInt144(x: BigInt): BigInt {
    let result = super.call("getAndReturnInt144", [
      EthereumValue.fromSignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnInt152(x: BigInt): BigInt {
    let result = super.call("getAndReturnInt152", [
      EthereumValue.fromSignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnInt160(x: BigInt): BigInt {
    let result = super.call("getAndReturnInt160", [
      EthereumValue.fromSignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnInt168(x: BigInt): BigInt {
    let result = super.call("getAndReturnInt168", [
      EthereumValue.fromSignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnInt176(x: BigInt): BigInt {
    let result = super.call("getAndReturnInt176", [
      EthereumValue.fromSignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnInt184(x: BigInt): BigInt {
    let result = super.call("getAndReturnInt184", [
      EthereumValue.fromSignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnInt192(x: BigInt): BigInt {
    let result = super.call("getAndReturnInt192", [
      EthereumValue.fromSignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnInt200(x: BigInt): BigInt {
    let result = super.call("getAndReturnInt200", [
      EthereumValue.fromSignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnInt208(x: BigInt): BigInt {
    let result = super.call("getAndReturnInt208", [
      EthereumValue.fromSignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnInt216(x: BigInt): BigInt {
    let result = super.call("getAndReturnInt216", [
      EthereumValue.fromSignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnInt224(x: BigInt): BigInt {
    let result = super.call("getAndReturnInt224", [
      EthereumValue.fromSignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnInt232(x: BigInt): BigInt {
    let result = super.call("getAndReturnInt232", [
      EthereumValue.fromSignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnInt240(x: BigInt): BigInt {
    let result = super.call("getAndReturnInt240", [
      EthereumValue.fromSignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnInt248(x: BigInt): BigInt {
    let result = super.call("getAndReturnInt248", [
      EthereumValue.fromSignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnInt256(x: BigInt): BigInt {
    let result = super.call("getAndReturnInt256", [
      EthereumValue.fromSignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnUint8(x: u32): u32 {
    let result = super.call("getAndReturnUint8", [EthereumValue.fromU32(x)]);
    return result[0].toU32();
  }

  getAndReturnUint16(x: u32): u32 {
    let result = super.call("getAndReturnUint16", [EthereumValue.fromU32(x)]);
    return result[0].toU32();
  }

  getAndReturnUint24(x: u32): u32 {
    let result = super.call("getAndReturnUint24", [EthereumValue.fromU32(x)]);
    return result[0].toU32();
  }

  getAndReturnUint32(x: u32): u32 {
    let result = super.call("getAndReturnUint32", [EthereumValue.fromU32(x)]);
    return result[0].toU32();
  }

  getAndReturnUint40(x: BigInt): BigInt {
    let result = super.call("getAndReturnUint40", [
      EthereumValue.fromUnsignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnUint48(x: BigInt): BigInt {
    let result = super.call("getAndReturnUint48", [
      EthereumValue.fromUnsignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnUint56(x: BigInt): BigInt {
    let result = super.call("getAndReturnUint56", [
      EthereumValue.fromUnsignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnUint64(x: BigInt): BigInt {
    let result = super.call("getAndReturnUint64", [
      EthereumValue.fromUnsignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnUint72(x: BigInt): BigInt {
    let result = super.call("getAndReturnUint72", [
      EthereumValue.fromUnsignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnUint80(x: BigInt): BigInt {
    let result = super.call("getAndReturnUint80", [
      EthereumValue.fromUnsignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnUint88(x: BigInt): BigInt {
    let result = super.call("getAndReturnUint88", [
      EthereumValue.fromUnsignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnUint96(x: BigInt): BigInt {
    let result = super.call("getAndReturnUint96", [
      EthereumValue.fromUnsignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnUint104(x: BigInt): BigInt {
    let result = super.call("getAndReturnUint104", [
      EthereumValue.fromUnsignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnUint112(x: BigInt): BigInt {
    let result = super.call("getAndReturnUint112", [
      EthereumValue.fromUnsignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnUint120(x: BigInt): BigInt {
    let result = super.call("getAndReturnUint120", [
      EthereumValue.fromUnsignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnUint128(x: BigInt): BigInt {
    let result = super.call("getAndReturnUint128", [
      EthereumValue.fromUnsignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnUint136(x: BigInt): BigInt {
    let result = super.call("getAndReturnUint136", [
      EthereumValue.fromUnsignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnUint144(x: BigInt): BigInt {
    let result = super.call("getAndReturnUint144", [
      EthereumValue.fromUnsignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnUint152(x: BigInt): BigInt {
    let result = super.call("getAndReturnUint152", [
      EthereumValue.fromUnsignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnUint160(x: BigInt): BigInt {
    let result = super.call("getAndReturnUint160", [
      EthereumValue.fromUnsignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnUint168(x: BigInt): BigInt {
    let result = super.call("getAndReturnUint168", [
      EthereumValue.fromUnsignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnUint176(x: BigInt): BigInt {
    let result = super.call("getAndReturnUint176", [
      EthereumValue.fromUnsignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnUint184(x: BigInt): BigInt {
    let result = super.call("getAndReturnUint184", [
      EthereumValue.fromUnsignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnUint192(x: BigInt): BigInt {
    let result = super.call("getAndReturnUint192", [
      EthereumValue.fromUnsignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnUint200(x: BigInt): BigInt {
    let result = super.call("getAndReturnUint200", [
      EthereumValue.fromUnsignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnUint208(x: BigInt): BigInt {
    let result = super.call("getAndReturnUint208", [
      EthereumValue.fromUnsignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnUint216(x: BigInt): BigInt {
    let result = super.call("getAndReturnUint216", [
      EthereumValue.fromUnsignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnUint224(x: BigInt): BigInt {
    let result = super.call("getAndReturnUint224", [
      EthereumValue.fromUnsignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnUint232(x: BigInt): BigInt {
    let result = super.call("getAndReturnUint232", [
      EthereumValue.fromUnsignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnUint240(x: BigInt): BigInt {
    let result = super.call("getAndReturnUint240", [
      EthereumValue.fromUnsignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnUint248(x: BigInt): BigInt {
    let result = super.call("getAndReturnUint248", [
      EthereumValue.fromUnsignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnUint256(x: BigInt): BigInt {
    let result = super.call("getAndReturnUint256", [
      EthereumValue.fromUnsignedBigInt(x)
    ]);
    return result[0].toBigInt();
  }

  getAndReturnAddressArray(x: Array<Address>): Array<Address> {
    let result = super.call("getAndReturnAddressArray", [
      EthereumValue.fromAddressArray(x)
    ]);
    return result[0].toAddressArray();
  }

  getAndReturnStringArray(x: Array<String>): Array<String> {
    let result = super.call("getAndReturnStringArray", [
      EthereumValue.fromStringArray(x)
    ]);
    return result[0].toStringArray();
  }

  getAndReturnBoolArray(x: Array<boolean>): Array<boolean> {
    let result = super.call("getAndReturnBoolArray", [
      EthereumValue.fromBooleanArray(x)
    ]);
    return result[0].toBooleanArray();
  }

  getAndReturnByteArray(x: Array<Bytes>): Array<Bytes> {
    let result = super.call("getAndReturnByteArray", [
      EthereumValue.fromBytesArray(x)
    ]);
    return result[0].toBytesArray();
  }

  getAndReturnBytes1Array(x: Array<Bytes>): Array<Bytes> {
    let result = super.call("getAndReturnBytes1Array", [
      EthereumValue.fromBytesArray(x)
    ]);
    return result[0].toBytesArray();
  }

  getAndReturnBytes32Array(x: Array<Bytes>): Array<Bytes> {
    let result = super.call("getAndReturnBytes32Array", [
      EthereumValue.fromBytesArray(x)
    ]);
    return result[0].toBytesArray();
  }

  getAndReturnInt8Array(x: Array<i32>): Array<i32> {
    let result = super.call("getAndReturnInt8Array", [
      EthereumValue.fromI32Array(x)
    ]);
    return result[0].toI32Array();
  }

  getAndReturnInt16Array(x: Array<i32>): Array<i32> {
    let result = super.call("getAndReturnInt16Array", [
      EthereumValue.fromI32Array(x)
    ]);
    return result[0].toI32Array();
  }

  getAndReturnInt24Array(x: Array<i32>): Array<i32> {
    let result = super.call("getAndReturnInt24Array", [
      EthereumValue.fromI32Array(x)
    ]);
    return result[0].toI32Array();
  }

  getAndReturnInt32Array(x: Array<i32>): Array<i32> {
    let result = super.call("getAndReturnInt32Array", [
      EthereumValue.fromI32Array(x)
    ]);
    return result[0].toI32Array();
  }

  getAndReturnInt40Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnInt40Array", [
      EthereumValue.fromSignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnInt48Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnInt48Array", [
      EthereumValue.fromSignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnInt56Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnInt56Array", [
      EthereumValue.fromSignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnInt64Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnInt64Array", [
      EthereumValue.fromSignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnInt72Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnInt72Array", [
      EthereumValue.fromSignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnInt80Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnInt80Array", [
      EthereumValue.fromSignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnInt88Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnInt88Array", [
      EthereumValue.fromSignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnInt96Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnInt96Array", [
      EthereumValue.fromSignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnInt104Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnInt104Array", [
      EthereumValue.fromSignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnInt112Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnInt112Array", [
      EthereumValue.fromSignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnInt120Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnInt120Array", [
      EthereumValue.fromSignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnInt128Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnInt128Array", [
      EthereumValue.fromSignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnInt136Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnInt136Array", [
      EthereumValue.fromSignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnInt144Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnInt144Array", [
      EthereumValue.fromSignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnInt152Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnInt152Array", [
      EthereumValue.fromSignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnInt160Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnInt160Array", [
      EthereumValue.fromSignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnInt168Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnInt168Array", [
      EthereumValue.fromSignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnInt176Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnInt176Array", [
      EthereumValue.fromSignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnInt184Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnInt184Array", [
      EthereumValue.fromSignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnInt192Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnInt192Array", [
      EthereumValue.fromSignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnInt200Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnInt200Array", [
      EthereumValue.fromSignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnInt208Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnInt208Array", [
      EthereumValue.fromSignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnInt216Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnInt216Array", [
      EthereumValue.fromSignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnInt224Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnInt224Array", [
      EthereumValue.fromSignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnInt232Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnInt232Array", [
      EthereumValue.fromSignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnInt240Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnInt240Array", [
      EthereumValue.fromSignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnInt248Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnInt248Array", [
      EthereumValue.fromSignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnInt256Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnInt256Array", [
      EthereumValue.fromSignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnUint8Array(x: Array<u32>): Array<u32> {
    let result = super.call("getAndReturnUint8Array", [
      EthereumValue.fromU32Array(x)
    ]);
    return result[0].toU32Array();
  }

  getAndReturnUint16Array(x: Array<u32>): Array<u32> {
    let result = super.call("getAndReturnUint16Array", [
      EthereumValue.fromU32Array(x)
    ]);
    return result[0].toU32Array();
  }

  getAndReturnUint24Array(x: Array<u32>): Array<u32> {
    let result = super.call("getAndReturnUint24Array", [
      EthereumValue.fromU32Array(x)
    ]);
    return result[0].toU32Array();
  }

  getAndReturnUint32Array(x: Array<u32>): Array<u32> {
    let result = super.call("getAndReturnUint32Array", [
      EthereumValue.fromU32Array(x)
    ]);
    return result[0].toU32Array();
  }

  getAndReturnUint40Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnUint40Array", [
      EthereumValue.fromUnsignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnUint48Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnUint48Array", [
      EthereumValue.fromUnsignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnUint56Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnUint56Array", [
      EthereumValue.fromUnsignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnUint64Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnUint64Array", [
      EthereumValue.fromUnsignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnUint72Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnUint72Array", [
      EthereumValue.fromUnsignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnUint80Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnUint80Array", [
      EthereumValue.fromUnsignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnUint88Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnUint88Array", [
      EthereumValue.fromUnsignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnUint96Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnUint96Array", [
      EthereumValue.fromUnsignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnUint104Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnUint104Array", [
      EthereumValue.fromUnsignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnUint112Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnUint112Array", [
      EthereumValue.fromUnsignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnUint120Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnUint120Array", [
      EthereumValue.fromUnsignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnUint128Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnUint128Array", [
      EthereumValue.fromUnsignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnUint136Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnUint136Array", [
      EthereumValue.fromUnsignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnUint144Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnUint144Array", [
      EthereumValue.fromUnsignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnUint152Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnUint152Array", [
      EthereumValue.fromUnsignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnUint160Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnUint160Array", [
      EthereumValue.fromUnsignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnUint168Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnUint168Array", [
      EthereumValue.fromUnsignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnUint176Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnUint176Array", [
      EthereumValue.fromUnsignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnUint184Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnUint184Array", [
      EthereumValue.fromUnsignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnUint192Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnUint192Array", [
      EthereumValue.fromUnsignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnUint200Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnUint200Array", [
      EthereumValue.fromUnsignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnUint208Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnUint208Array", [
      EthereumValue.fromUnsignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnUint216Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnUint216Array", [
      EthereumValue.fromUnsignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnUint224Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnUint224Array", [
      EthereumValue.fromUnsignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnUint232Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnUint232Array", [
      EthereumValue.fromUnsignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnUint240Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnUint240Array", [
      EthereumValue.fromUnsignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnUint248Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnUint248Array", [
      EthereumValue.fromUnsignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }

  getAndReturnUint256Array(x: Array<BigInt>): Array<BigInt> {
    let result = super.call("getAndReturnUint256Array", [
      EthereumValue.fromUnsignedBigIntArray(x)
    ]);
    return result[0].toBigIntArray();
  }
}
