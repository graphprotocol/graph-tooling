import {
  TypedMap,
  Entity,
  Value,
  Address,
  Bytes,
  BigInt
} from "@graphprotocol/graph-ts";

export class MyEntity extends Entity {
  get name(): string {
    let value = this.get("name");
    if (value === null) {
      return null;
    } else {
      return value.toString() as string;
    }
  }

  set name(value: string) {
    if (value === null) {
      this.unset("name");
    } else {
      this.set("name", Value.fromString(value as string));
    }
  }
}
