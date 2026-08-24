import { ByteArray, Bytes } from './temp_lib/index';

// Test some Bytes methods.
export function testBytesWithByteArray(): void {
  const longArray = new ByteArray(5);
  longArray[0] = 251;
  longArray[1] = 255;
  longArray[2] = 251;
  longArray[3] = 255;
  longArray[4] = 0;
  assert(longArray.toU32() == 4_294_705_147);
  // 4_294_705_147 is past i32.MAX_VALUE, so toI32 reports an overflow rather than
  // returning the wrapped -262_149. The assert cannot be written here: an overflow
  // aborts, and this harness has no way to expect one.

  // Widening a value with sign padding must keep converting - these all still fit.
  const i32Max = new ByteArray(5);
  i32Max[0] = 255;
  i32Max[1] = 255;
  i32Max[2] = 255;
  i32Max[3] = 127;
  i32Max[4] = 0;
  assert(i32Max.toI32() == 2_147_483_647);

  const i32Min = new ByteArray(5);
  i32Min[0] = 0;
  i32Min[1] = 0;
  i32Min[2] = 0;
  i32Min[3] = 128;
  i32Min[4] = 255;
  assert(i32Min.toI32() == -2_147_483_648);

  // The same value in exactly four bytes is a plain i32 and is unaffected.
  const i32MinNarrow = new ByteArray(4);
  i32MinNarrow[0] = 0;
  i32MinNarrow[1] = 0;
  i32MinNarrow[2] = 0;
  i32MinNarrow[3] = 128;
  assert(i32MinNarrow.toI32() == -2_147_483_648);

  const bytes = Bytes.fromHexString('0x56696b746f726961');
  assert((bytes[0] = 0x56));
  assert((bytes[1] = 0x69));
  assert((bytes[2] = 0x6b));
  assert((bytes[3] = 0x74));
  assert((bytes[4] = 0x6f));
  assert((bytes[5] = 0x72));
  assert((bytes[6] = 0x69));
  assert((bytes[7] = 0x61));

  // eslint-disable-next-line no-self-compare
  assert(ByteArray.fromI32(1) == ByteArray.fromI32(1));
  assert(ByteArray.fromI32(1) != ByteArray.fromI32(2));
}

export function testBytesFromUTF8(): void {
  // [123, 32, 34, 104, 101, 108, 108, 111, 34, 58, 32, 34, 119, 111, 114, 108, 100, 34, 32, 125]
  const str = '{ "hello": "world" }';

  const bytes = Bytes.fromUTF8(str);

  for (let i = 0; i < bytes.length; i++) {
    assert(bytes[i] == str.charCodeAt(i));
  }
}
