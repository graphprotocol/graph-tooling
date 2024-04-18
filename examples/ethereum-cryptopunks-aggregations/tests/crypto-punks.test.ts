import {
  afterAll,
  assert,
  beforeAll,
  clearStore,
  describe,
  test,
} from 'matchstick-as/assembly/index';
import { Address, BigInt } from '@graphprotocol/graph-ts';
import { Assign as AssignEvent } from '../generated/CryptoPunks/CryptoPunks';
import { Assign } from '../generated/schema';
import { handleAssign } from '../src/crypto-punks';
import { createAssignEvent } from './crypto-punks-utils';

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe('Describe entity assertions', () => {
  beforeAll(() => {
    let to = Address.fromString('0x0000000000000000000000000000000000000001');
    let punkIndex = BigInt.fromI32(234);
    let newAssignEvent = createAssignEvent(to, punkIndex);
    handleAssign(newAssignEvent);
  });

  afterAll(() => {
    clearStore();
  });

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test('Assign created and stored', () => {
    assert.entityCount('Assign', 1);

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      'Assign',
      '0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1',
      'to',
      '0x0000000000000000000000000000000000000001',
    );
    assert.fieldEquals(
      'Assign',
      '0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1',
      'punkIndex',
      '234',
    );

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  });
});
