import { describe, newMockEvent, test } from 'matchstick-as';
import { BlockTime } from '../generated/schema';

describe('BlockTime test', () => {
    test("it creates a BlockTime from mockevent", () => {
        const mockEvent = newMockEvent();
        const blockTimeEntity = new BlockTime("123"); // timestamp = 1
        blockTimeEntity.timestamp = mockEvent.block.timestamp.toI32()
        blockTimeEntity.save();
    })
    test("it creates a BlockTime with timestamp equals to 1", () => {
        const blockTimeEntity = new BlockTime("123");
        blockTimeEntity.timestamp = 1;
        blockTimeEntity.save();
    })
    test("it creates a BlockTime with timestamp equals to 1731324636000000", () => {
        const blockTimeEntity = new BlockTime("123");
        blockTimeEntity.timestamp = 1731324636000000
        blockTimeEntity.save();
    })
});
