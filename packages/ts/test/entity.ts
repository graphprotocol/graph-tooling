import { BigDecimal, BigInt, Bytes, Entity } from 'temp_lib/index';

export function testEntity(): void {
  const entity = new Entity();

  entity.setBytes('x', new Bytes(1));
  assert(entity.getBytes('x') == new Bytes(1));

  entity.setBoolean('x', true);
  assert(entity.getBoolean('x') == true);

  entity.setBigDecimal('x', new BigDecimal(BigInt.fromI32(2)));
  assert(entity.getBigDecimal('x') !== null);
}
