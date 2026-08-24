---
'@graphprotocol/graph-ts': patch
---

`ByteArray.toI32` and `ByteArray.toI64` now report an overflow for a positive value
that needs the sign bit of the widest byte, instead of returning it as a negative
number. The overflow check only compared the bytes above the target width against the
sign padding, so `0x80000000` carried in five bytes - exactly what
`BigInt.fromUnsignedBytes` produces for a `u32` at or above `2^31` - passed the check
and came back as `-2147483648`.
