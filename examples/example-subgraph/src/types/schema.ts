import {
  TypedMap,
  Entity,
  Value,
  Address,
  Bytes,
  BigInt
} from "@graphprotocol/graph-ts";

export class ExampleEntity extends Entity {
  get optionalBoolean(): boolean | null {
    let value = this.get("optionalBoolean");
    if (value === null) {
      return false;
    } else {
      return value.toBoolean() as boolean | null;
    }
  }

  set optionalBoolean(value: boolean | null) {
    if (value === null) {
      this.unset("optionalBoolean");
    } else {
      this.set("optionalBoolean", Value.fromBoolean(value as boolean));
    }
  }

  get requiredBoolean(): boolean {
    let value = this.get("requiredBoolean");
    if (value === null) {
      return false;
    } else {
      return value.toBoolean() as boolean;
    }
  }

  set requiredBoolean(value: boolean) {
    if (value === null) {
      this.unset("requiredBoolean");
    } else {
      this.set("requiredBoolean", Value.fromBoolean(value as boolean));
    }
  }

  get optionalBooleanList(): Array<boolean> | null {
    let value = this.get("optionalBooleanList");
    if (value === null) {
      return null;
    } else {
      return value.toBooleanArray() as Array<boolean> | null;
    }
  }

  set optionalBooleanList(value: Array<boolean> | null) {
    if (value === null) {
      this.unset("optionalBooleanList");
    } else {
      this.set(
        "optionalBooleanList",
        Value.fromBooleanArray(value as Array<boolean>)
      );
    }
  }

  get requiredBooleanList(): Array<boolean> {
    let value = this.get("requiredBooleanList");
    if (value === null) {
      return null;
    } else {
      return value.toBooleanArray() as Array<boolean>;
    }
  }

  set requiredBooleanList(value: Array<boolean>) {
    if (value === null) {
      this.unset("requiredBooleanList");
    } else {
      this.set(
        "requiredBooleanList",
        Value.fromBooleanArray(value as Array<boolean>)
      );
    }
  }

  get optionalString(): string | null {
    let value = this.get("optionalString");
    if (value === null) {
      return null;
    } else {
      return value.toString() as string | null;
    }
  }

  set optionalString(value: string | null) {
    if (value === null) {
      this.unset("optionalString");
    } else {
      this.set("optionalString", Value.fromString(value as string));
    }
  }

  get requiredString(): string {
    let value = this.get("requiredString");
    if (value === null) {
      return null;
    } else {
      return value.toString() as string;
    }
  }

  set requiredString(value: string) {
    if (value === null) {
      this.unset("requiredString");
    } else {
      this.set("requiredString", Value.fromString(value as string));
    }
  }

  get optionalStringList(): Array<string> | null {
    let value = this.get("optionalStringList");
    if (value === null) {
      return null;
    } else {
      return value.toStringArray() as Array<string> | null;
    }
  }

  set optionalStringList(value: Array<string> | null) {
    if (value === null) {
      this.unset("optionalStringList");
    } else {
      this.set(
        "optionalStringList",
        Value.fromStringArray(value as Array<string>)
      );
    }
  }

  get requiredStringList(): Array<string> {
    let value = this.get("requiredStringList");
    if (value === null) {
      return null;
    } else {
      return value.toStringArray() as Array<string>;
    }
  }

  set requiredStringList(value: Array<string>) {
    if (value === null) {
      this.unset("requiredStringList");
    } else {
      this.set(
        "requiredStringList",
        Value.fromStringArray(value as Array<string>)
      );
    }
  }

  get optionalBytes(): Bytes | null {
    let value = this.get("optionalBytes");
    if (value === null) {
      return null;
    } else {
      return value.toBytes() as Bytes | null;
    }
  }

  set optionalBytes(value: Bytes | null) {
    if (value === null) {
      this.unset("optionalBytes");
    } else {
      this.set("optionalBytes", Value.fromBytes(value as Bytes));
    }
  }

  get requiredBytes(): Bytes {
    let value = this.get("requiredBytes");
    if (value === null) {
      return null;
    } else {
      return value.toBytes() as Bytes;
    }
  }

  set requiredBytes(value: Bytes) {
    if (value === null) {
      this.unset("requiredBytes");
    } else {
      this.set("requiredBytes", Value.fromBytes(value as Bytes));
    }
  }

  get optionalBytesList(): Array<Bytes> | null {
    let value = this.get("optionalBytesList");
    if (value === null) {
      return null;
    } else {
      return value.toBytesArray() as Array<Bytes> | null;
    }
  }

  set optionalBytesList(value: Array<Bytes> | null) {
    if (value === null) {
      this.unset("optionalBytesList");
    } else {
      this.set(
        "optionalBytesList",
        Value.fromBytesArray(value as Array<Bytes>)
      );
    }
  }

  get requiredBytesList(): Array<Bytes> {
    let value = this.get("requiredBytesList");
    if (value === null) {
      return null;
    } else {
      return value.toBytesArray() as Array<Bytes>;
    }
  }

  set requiredBytesList(value: Array<Bytes>) {
    if (value === null) {
      this.unset("requiredBytesList");
    } else {
      this.set(
        "requiredBytesList",
        Value.fromBytesArray(value as Array<Bytes>)
      );
    }
  }

  get optionalInt(): i32 | null {
    let value = this.get("optionalInt");
    if (value === null) {
      return null;
    } else {
      return value.toI32() as i32 | null;
    }
  }

  set optionalInt(value: i32 | null) {
    if (value === null) {
      this.unset("optionalInt");
    } else {
      this.set("optionalInt", Value.fromI32(value as i32));
    }
  }

  get requiredInt(): i32 {
    let value = this.get("requiredInt");
    if (value === null) {
      return null;
    } else {
      return value.toI32() as i32;
    }
  }

  set requiredInt(value: i32) {
    if (value === null) {
      this.unset("requiredInt");
    } else {
      this.set("requiredInt", Value.fromI32(value as i32));
    }
  }

  get optionalIntList(): Array<i32> | null {
    let value = this.get("optionalIntList");
    if (value === null) {
      return null;
    } else {
      return value.toI32Array() as Array<i32> | null;
    }
  }

  set optionalIntList(value: Array<i32> | null) {
    if (value === null) {
      this.unset("optionalIntList");
    } else {
      this.set("optionalIntList", Value.fromI32Array(value as Array<i32>));
    }
  }

  get requiredIntList(): Array<i32> {
    let value = this.get("requiredIntList");
    if (value === null) {
      return null;
    } else {
      return value.toI32Array() as Array<i32>;
    }
  }

  set requiredIntList(value: Array<i32>) {
    if (value === null) {
      this.unset("requiredIntList");
    } else {
      this.set("requiredIntList", Value.fromI32Array(value as Array<i32>));
    }
  }

  get optionalBigInt(): BigInt | null {
    let value = this.get("optionalBigInt");
    if (value === null) {
      return null;
    } else {
      return value.toBigInt() as BigInt | null;
    }
  }

  set optionalBigInt(value: BigInt | null) {
    if (value === null) {
      this.unset("optionalBigInt");
    } else {
      this.set("optionalBigInt", Value.fromBigInt(value as BigInt));
    }
  }

  get requiredBigInt(): BigInt {
    let value = this.get("requiredBigInt");
    if (value === null) {
      return null;
    } else {
      return value.toBigInt() as BigInt;
    }
  }

  set requiredBigInt(value: BigInt) {
    if (value === null) {
      this.unset("requiredBigInt");
    } else {
      this.set("requiredBigInt", Value.fromBigInt(value as BigInt));
    }
  }

  get optionalBigIntList(): Array<BigInt> | null {
    let value = this.get("optionalBigIntList");
    if (value === null) {
      return null;
    } else {
      return value.toBigIntArray() as Array<BigInt> | null;
    }
  }

  set optionalBigIntList(value: Array<BigInt> | null) {
    if (value === null) {
      this.unset("optionalBigIntList");
    } else {
      this.set(
        "optionalBigIntList",
        Value.fromBigIntArray(value as Array<BigInt>)
      );
    }
  }

  get requiredBigIntList(): Array<BigInt> {
    let value = this.get("requiredBigIntList");
    if (value === null) {
      return null;
    } else {
      return value.toBigIntArray() as Array<BigInt>;
    }
  }

  set requiredBigIntList(value: Array<BigInt>) {
    if (value === null) {
      this.unset("requiredBigIntList");
    } else {
      this.set(
        "requiredBigIntList",
        Value.fromBigIntArray(value as Array<BigInt>)
      );
    }
  }

  get optionalReference(): string | null {
    let value = this.get("optionalReference");
    if (value === null) {
      return null;
    } else {
      return value.toString() as string | null;
    }
  }

  set optionalReference(value: string | null) {
    if (value === null) {
      this.unset("optionalReference");
    } else {
      this.set("optionalReference", Value.fromString(value as string));
    }
  }

  get requiredReference(): string {
    let value = this.get("requiredReference");
    if (value === null) {
      return null;
    } else {
      return value.toString() as string;
    }
  }

  set requiredReference(value: string) {
    if (value === null) {
      this.unset("requiredReference");
    } else {
      this.set("requiredReference", Value.fromString(value as string));
    }
  }

  get optionalReferenceList(): Array<string> | null {
    let value = this.get("optionalReferenceList");
    if (value === null) {
      return null;
    } else {
      return value.toStringArray() as Array<string> | null;
    }
  }

  set optionalReferenceList(value: Array<string> | null) {
    if (value === null) {
      this.unset("optionalReferenceList");
    } else {
      this.set(
        "optionalReferenceList",
        Value.fromStringArray(value as Array<string>)
      );
    }
  }

  get requiredReferenceList(): Array<string> {
    let value = this.get("requiredReferenceList");
    if (value === null) {
      return null;
    } else {
      return value.toStringArray() as Array<string>;
    }
  }

  set requiredReferenceList(value: Array<string>) {
    if (value === null) {
      this.unset("requiredReferenceList");
    } else {
      this.set(
        "requiredReferenceList",
        Value.fromStringArray(value as Array<string>)
      );
    }
  }
}
