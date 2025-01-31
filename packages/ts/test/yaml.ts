import { TypedMap, YAMLValue } from './temp_lib/index';

export function testYAMLMethods(): void {
  let val: YAMLValue;

  val = YAMLValue.newNull();
  assert(val.isNull());

  val = YAMLValue.newBool(true);
  assert(val.isBool());
  assert(val.toBool() == true);

  val = YAMLValue.newI64(1);
  assert(val.isNumber());
  assert(val.toNumber() == '1');
  assert(val.toI64() == 1);

  val = YAMLValue.newU64(1);
  assert(val.isNumber());
  assert(val.toNumber() == '1');
  assert(val.toU64() == 1);

  val = YAMLValue.newF64(1.2);
  assert(val.isNumber());
  assert(val.toNumber() == '1.2');
  assert(val.toF64() == 1.2);

  val = YAMLValue.newString('a');
  assert(val.isString());
  assert(val.toString() == 'a');

  val = YAMLValue.newArray([YAMLValue.newU64(1)]);
  assert(val.isArray());
  assert(val.toArray().length == 1);
  assert(val.toArray()[0].toNumber() == '1');

  let obj: TypedMap<YAMLValue, YAMLValue> = new TypedMap();
  obj.set(YAMLValue.newString('a'), YAMLValue.newString('b'));

  val = YAMLValue.newObject(obj);
  assert(val.isObject());
  assert(val.toObject().entries.length == 1);
  assert(val.toObject().mustGet(YAMLValue.newString('a')).toString() == 'b');

  val = YAMLValue.newTagged('a', YAMLValue.newString('b'));
  assert(val.isTagged());
  assert((val.toTagged().tag = 'a'));
  assert(val.toTagged().value.toString() == 'b');
}

export function testYAMLEqNeOverloads(): void {
  assert(YAMLValue.newBool(true) == YAMLValue.newBool(true));
  assert(!(YAMLValue.newBool(true) != YAMLValue.newBool(true)));
  assert(YAMLValue.newBool(true) != YAMLValue.newBool(false));

  assert(YAMLValue.newU64(1) == YAMLValue.newU64(1));
  assert(!(YAMLValue.newU64(1) != YAMLValue.newU64(1)));
  assert(YAMLValue.newU64(1) != YAMLValue.newU64(2));

  assert(YAMLValue.newString('a') == YAMLValue.newString('a'));
  assert(!(YAMLValue.newString('a') != YAMLValue.newString('a')));
  assert(YAMLValue.newString('a') != YAMLValue.newString('b'));

  assert(YAMLValue.newArray([YAMLValue.newU64(1)]) == YAMLValue.newArray([YAMLValue.newU64(1)]));
  assert(!(YAMLValue.newArray([YAMLValue.newU64(1)]) != YAMLValue.newArray([YAMLValue.newU64(1)])));
  assert(
    YAMLValue.newArray([YAMLValue.newU64(1)]) !=
      YAMLValue.newArray([YAMLValue.newU64(1), YAMLValue.newU64(2)]),
  );
  assert(YAMLValue.newArray([YAMLValue.newU64(1)]) != YAMLValue.newArray([YAMLValue.newU64(2)]));

  const objA: TypedMap<YAMLValue, YAMLValue> = new TypedMap();
  objA.set(YAMLValue.newString('a'), YAMLValue.newString('b'));

  const objB: TypedMap<YAMLValue, YAMLValue> = new TypedMap();
  objB.set(YAMLValue.newString('a'), YAMLValue.newString('b'));

  assert(YAMLValue.newObject(objA) == YAMLValue.newObject(objB));
  assert(!(YAMLValue.newObject(objA) != YAMLValue.newObject(objB)));

  objA.set(YAMLValue.newString('c'), YAMLValue.newString('d'));
  assert(YAMLValue.newObject(objA) != YAMLValue.newObject(objB));

  objB.set(YAMLValue.newString('c'), YAMLValue.newString('e'));
  assert(YAMLValue.newObject(objA) != YAMLValue.newObject(objB));

  assert(
    YAMLValue.newTagged('a', YAMLValue.newString('b')) ==
      YAMLValue.newTagged('a', YAMLValue.newString('b')),
  );
  assert(
    !(
      YAMLValue.newTagged('a', YAMLValue.newString('b')) !=
      YAMLValue.newTagged('a', YAMLValue.newString('b'))
    ),
  );
  assert(
    YAMLValue.newTagged('a', YAMLValue.newString('b')) !=
      YAMLValue.newTagged('c', YAMLValue.newString('d')),
  );
}

export function testYAMLIndexOverload(): void {
  const objA: TypedMap<YAMLValue, YAMLValue> = new TypedMap();
  const objB: TypedMap<YAMLValue, YAMLValue> = new TypedMap();

  objB.set(YAMLValue.newString('b'), YAMLValue.newString('c'));
  objA.set(YAMLValue.newString('a'), YAMLValue.newArray([YAMLValue.newObject(objB)]));

  assert(YAMLValue.newObject(objA)['a']['0']['b'].toString() == 'c');
}
