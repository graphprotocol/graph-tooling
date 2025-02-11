import { Bytes, Result, TypedMap } from './collections';
import { BigInt } from './numbers';

/**
 * Host YAML interface.
 */
export declare namespace yaml {
  /**
   * Parses a YAML document from UTF-8 encoded bytes.
   * Aborts mapping execution if the bytes cannot be parsed.
   */
  function fromBytes(data: Bytes): YAMLValue;

  /**
   * Parses a YAML document from UTF-8 encoded bytes.
   * Returns `Result.error == true` if the bytes cannot be parsed.
   */
  function try_fromBytes(data: Bytes): Result<YAMLValue, bool>;
}

export namespace yaml {
  /**
   * Parses a YAML document from a UTF-8 encoded string.
   * Aborts mapping execution if the string cannot be parsed.
   */
  export function fromString(data: string): YAMLValue {
    const bytes = Bytes.fromUTF8(data);

    return yaml.fromBytes(bytes);
  }

  /**
   * Parses a YAML document from a UTF-8 encoded string.
   * Returns `Result.error == true` if the string cannot be parsed.
   */
  export function try_fromString(data: string): Result<YAMLValue, bool> {
    const bytes = Bytes.fromUTF8(data);

    return yaml.try_fromBytes(bytes);
  }
}

/**
 * All possible YAML value types.
 */
export enum YAMLValueKind {
  NULL = 0,
  BOOL = 1,
  NUMBER = 2,
  STRING = 3,
  ARRAY = 4,
  OBJECT = 5,
  TAGGED = 6,
}

/**
 * Pointer type for `YAMLValue` data.
 *
 * Big enough to fit any pointer or native `YAMLValue.data`.
 */
export type YAMLValuePayload = u64;

export class YAMLValue {
  kind: YAMLValueKind;
  data: YAMLValuePayload;

  constructor(kind: YAMLValueKind, data: YAMLValuePayload) {
    this.kind = kind;
    this.data = data;
  }

  static newNull(): YAMLValue {
    return new YAMLValue(YAMLValueKind.NULL, 0);
  }

  static newBool(data: bool): YAMLValue {
    return new YAMLValue(YAMLValueKind.BOOL, data ? 1 : 0);
  }

  static newI64(data: i64): YAMLValue {
    return new YAMLValue(YAMLValueKind.NUMBER, changetype<usize>(data.toString()));
  }

  static newU64(data: u64): YAMLValue {
    return new YAMLValue(YAMLValueKind.NUMBER, changetype<usize>(data.toString()));
  }

  static newF64(data: f64): YAMLValue {
    return new YAMLValue(YAMLValueKind.NUMBER, changetype<usize>(data.toString()));
  }

  static newBigInt(data: BigInt): YAMLValue {
    return new YAMLValue(YAMLValueKind.STRING, changetype<usize>(data.toString()));
  }

  static newString(data: string): YAMLValue {
    return new YAMLValue(YAMLValueKind.STRING, changetype<usize>(data));
  }

  static newArray(data: Array<YAMLValue>): YAMLValue {
    return new YAMLValue(YAMLValueKind.ARRAY, changetype<usize>(data));
  }

  static newObject(data: TypedMap<YAMLValue, YAMLValue>): YAMLValue {
    return new YAMLValue(YAMLValueKind.OBJECT, changetype<usize>(data));
  }

  static newTagged(tag: string, value: YAMLValue): YAMLValue {
    const tagged = new YAMLTaggedValue(tag, value);
    return new YAMLValue(YAMLValueKind.TAGGED, changetype<usize>(tagged));
  }

  isNull(): bool {
    return this.kind == YAMLValueKind.NULL;
  }

  isBool(): bool {
    return this.kind == YAMLValueKind.BOOL;
  }

  isNumber(): bool {
    return this.kind == YAMLValueKind.NUMBER;
  }

  isString(): bool {
    return this.kind == YAMLValueKind.STRING;
  }

  isArray(): bool {
    return this.kind == YAMLValueKind.ARRAY;
  }

  isObject(): bool {
    return this.kind == YAMLValueKind.OBJECT;
  }

  isTagged(): bool {
    return this.kind == YAMLValueKind.TAGGED;
  }

  toBool(): bool {
    assert(this.isBool(), 'YAML value is not a boolean');
    return this.data != 0;
  }

  toNumber(): string {
    assert(this.isNumber(), 'YAML value is not a number');
    return changetype<string>(this.data as usize);
  }

  toI64(): i64 {
    return I64.parseInt(this.toNumber());
  }

  toU64(): u64 {
    return U64.parseInt(this.toNumber());
  }

  toF64(): f64 {
    return F64.parseFloat(this.toNumber());
  }

  toBigInt(): BigInt {
    assert(this.isNumber() || this.isString(), 'YAML value is not numeric');
    return BigInt.fromString(changetype<string>(this.data as usize));
  }

  toString(): string {
    assert(this.isString(), 'YAML value is not a string');
    return changetype<string>(this.data as usize);
  }

  toArray(): Array<YAMLValue> {
    assert(this.isArray(), 'YAML value is not an array');
    return changetype<Array<YAMLValue>>(this.data as usize);
  }

  toObject(): TypedMap<YAMLValue, YAMLValue> {
    assert(this.isObject(), 'YAML value is not an object');
    return changetype<TypedMap<YAMLValue, YAMLValue>>(this.data as usize);
  }

  toTagged(): YAMLTaggedValue {
    assert(this.isTagged(), 'YAML value is not tagged');
    return changetype<YAMLTaggedValue>(this.data as usize);
  }

  // Allows access to YAML values from within an object.
  @operator('==')
  static eq(a: YAMLValue, b: YAMLValue): bool {
    if (a.isBool() && b.isBool()) {
      return a.toBool() == b.toBool();
    }

    if (a.isNumber() && b.isNumber()) {
      return a.toNumber() == b.toNumber();
    }

    if (a.isString() && b.isString()) {
      return a.toString() == b.toString();
    }

    if (a.isArray() && b.isArray()) {
      const arrA = a.toArray();
      const arrB = b.toArray();

      if (arrA.length == arrB.length) {
        for (let i = 0; i < arrA.length; i++) {
          if (arrA[i] != arrB[i]) {
            return false;
          }
        }

        return true;
      }

      return false;
    }

    if (a.isObject() && b.isObject()) {
      const objA = a.toObject();
      const objB = b.toObject();

      if (objA.entries.length == objB.entries.length) {
        for (let i = 0; i < objA.entries.length; i++) {
          const valB = objB.get(objA.entries[i].key);

          if (!valB || objA.entries[i].value != valB) {
            return false;
          }
        }

        return true;
      }

      return false;
    }

    if (a.isTagged() && b.isTagged()) {
      return a.toTagged() == b.toTagged();
    }

    return false;
  }

  // Allows access to YAML values from within an object.
  @operator('!=')
  static ne(a: YAMLValue | null, b: YAMLValue | null): bool {
    if (!a || !b) {
      return true;
    }

    return !(a! == b!);
  }

  // Makes it easier to access a specific index in a YAML array or a string key in a YAML object.
  //
  // Examples:
  //   Usage in YAML objects: `yaml.fromString(subgraphManifest)['specVersion']`;
  //   Nesting is also supported: `yaml.fromString(subgraphManifest)['schema']['file']`;
  //   Usage in YAML arrays: `yaml.fromString(subgraphManifest)['dataSources']['0']`;
  //   YAML arrays and objects: `yaml.fromString(subgraphManifest)['dataSources']['0']['source']['address']`;
  @operator('[]')
  get(index: string): YAMLValue {
    assert(this.isArray() || this.isObject(), 'YAML value can not be accessed by index');

    if (this.isArray()) {
      return this.toArray()[I32.parseInt(index)];
    }

    return this.toObject().mustGet(YAMLValue.newString(index));
  }
}

export class YAMLTaggedValue {
  tag: string;
  value: YAMLValue;

  constructor(tag: string, value: YAMLValue) {
    this.tag = tag;
    this.value = value;
  }

  // Allows access to YAML values from within an object.
  @operator('==')
  static eq(a: YAMLTaggedValue, b: YAMLTaggedValue): bool {
    return a.tag == b.tag && a.value == b.value;
  }

  // Allows access to YAML values from within an object.
  @operator('!=')
  static ne(a: YAMLTaggedValue | null, b: YAMLTaggedValue | null): bool {
    if (!a || !b) {
      return true;
    }

    return !(a! == b!);
  }
}
