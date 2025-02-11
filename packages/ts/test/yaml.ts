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

export function testComplexYAMLParsing(): void {
  const metadata = new TypedMap<YAMLValue, YAMLValue>();
  metadata.set(
    YAMLValue.newString('created_at'),
    YAMLValue.newTagged('timestamp', YAMLValue.newString('2025-01-01')),
  );
  metadata.set(YAMLValue.newString('author'), YAMLValue.newNull());

  const limits = new TypedMap<YAMLValue, YAMLValue>();
  limits.set(YAMLValue.newString('max_retry'), YAMLValue.newI64(3));
  limits.set(YAMLValue.newString('timeout'), YAMLValue.newI64(1000));

  const settings = new TypedMap<YAMLValue, YAMLValue>();
  settings.set(YAMLValue.newString('debug'), YAMLValue.newBool(true));
  settings.set(YAMLValue.newString('mode'), YAMLValue.newString('production'));
  settings.set(YAMLValue.newString('limits'), YAMLValue.newObject(limits));

  const tags = [
    YAMLValue.newString('important'),
    YAMLValue.newString('test'),
    YAMLValue.newString('v1'),
  ];

  const item1 = new TypedMap<YAMLValue, YAMLValue>();
  item1.set(YAMLValue.newString('name'), YAMLValue.newString('item1'));
  item1.set(YAMLValue.newString('value'), YAMLValue.newI64(100));

  const item2 = new TypedMap<YAMLValue, YAMLValue>();
  item2.set(YAMLValue.newString('name'), YAMLValue.newString('item2'));
  item2.set(YAMLValue.newString('value'), YAMLValue.newI64(200));

  const nestedArray = [YAMLValue.newObject(item1), YAMLValue.newObject(item2)];

  // Create the root object
  const root = new TypedMap<YAMLValue, YAMLValue>();
  root.set(YAMLValue.newString('name'), YAMLValue.newString('Test Config'));
  root.set(YAMLValue.newString('version'), YAMLValue.newF64(1.0));
  root.set(YAMLValue.newString('enabled'), YAMLValue.newBool(true));
  root.set(YAMLValue.newString('count'), YAMLValue.newI64(42));
  root.set(YAMLValue.newString('pi'), YAMLValue.newF64(3.14159));
  root.set(YAMLValue.newString('settings'), YAMLValue.newObject(settings));
  root.set(YAMLValue.newString('tags'), YAMLValue.newArray(tags));
  root.set(YAMLValue.newString('nested_array'), YAMLValue.newArray(nestedArray));
  root.set(YAMLValue.newString('metadata'), YAMLValue.newObject(metadata));

  const obj = YAMLValue.newObject(root);

  // Now validate the structure
  assert(obj.isObject());
  const parsed = obj.toObject();

  // Validate simple fields
  assert(parsed.mustGet(YAMLValue.newString('name')).toString() == 'Test Config');
  assert(parsed.mustGet(YAMLValue.newString('version')).toF64() == 1.0);
  assert(parsed.mustGet(YAMLValue.newString('enabled')).toBool() == true);
  assert(parsed.mustGet(YAMLValue.newString('count')).toI64() == 42);
  assert(parsed.mustGet(YAMLValue.newString('pi')).toF64() == 3.14159);

  // Validate nested object (settings)
  const parsedSettings = parsed.mustGet(YAMLValue.newString('settings')).toObject();
  assert(parsedSettings.mustGet(YAMLValue.newString('debug')).toBool() == true);
  assert(parsedSettings.mustGet(YAMLValue.newString('mode')).toString() == 'production');

  // Validate deeply nested object (settings.limits)
  const parsedLimits = parsedSettings.mustGet(YAMLValue.newString('limits')).toObject();
  assert(parsedLimits.mustGet(YAMLValue.newString('max_retry')).toI64() == 3);
  assert(parsedLimits.mustGet(YAMLValue.newString('timeout')).toI64() == 1000);

  // Validate array of strings (tags)
  const parsedTags = parsed.mustGet(YAMLValue.newString('tags')).toArray();
  assert(parsedTags.length == 3);
  assert(parsedTags[0].toString() == 'important');
  assert(parsedTags[1].toString() == 'test');
  assert(parsedTags[2].toString() == 'v1');

  // Validate array of objects (nested_array)
  const parsedNestedArray = parsed.mustGet(YAMLValue.newString('nested_array')).toArray();
  assert(parsedNestedArray.length == 2);

  const parsedItem1 = parsedNestedArray[0].toObject();
  assert(parsedItem1.mustGet(YAMLValue.newString('name')).toString() == 'item1');
  assert(parsedItem1.mustGet(YAMLValue.newString('value')).toI64() == 100);

  const parsedItem2 = parsedNestedArray[1].toObject();
  assert(parsedItem2.mustGet(YAMLValue.newString('name')).toString() == 'item2');
  assert(parsedItem2.mustGet(YAMLValue.newString('value')).toI64() == 200);

  // Validate tagged value and null
  const parsedMetadata = parsed.mustGet(YAMLValue.newString('metadata')).toObject();
  assert(parsedMetadata.mustGet(YAMLValue.newString('created_at')).isTagged());
  const parsedCreatedAt = parsedMetadata.mustGet(YAMLValue.newString('created_at')).toTagged();
  assert(parsedCreatedAt.tag == 'timestamp');
  assert(parsedCreatedAt.value.toString() == '2025-01-01');
  assert(parsedMetadata.mustGet(YAMLValue.newString('author')).isNull());
}
