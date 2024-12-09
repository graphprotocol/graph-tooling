import { describe, expect, it } from 'vitest';
import { sortWithPriority } from './sort.js'; // adjust the import based on your file structure

describe('sortWithPriority', () => {
  it('should sort numbers with specific priority elements', () => {
    const numbers = [5, 3, 9, 1, 4];
    const priorityNumbers = [9, 1];
    const result = sortWithPriority(numbers, priorityNumbers);
    expect(result).toEqual([1, 9, 3, 4, 5]);
  });

  it('should default sort numbers if no priority specifier', () => {
    const numbers = [5, 3, 9, 1, 4];
    const result = sortWithPriority(numbers);
    expect(result).toEqual([1, 3, 4, 5, 9]);
  });

  it('should sort strings with priority determined by a function', () => {
    const fruits = ['apple', 'orange', 'banana', 'mango', 'kiwi', 'melon'];
    const sortedFruits = sortWithPriority(fruits, fruit => fruit.startsWith('m'));
    expect(sortedFruits).toEqual(['mango', 'melon', 'apple', 'banana', 'kiwi', 'orange']);
  });

  it('should handle an empty array', () => {
    const emptyArray: never[] = [];
    const result = sortWithPriority(emptyArray, x => x > 3);
    expect(result).toEqual([]);
  });

  it('should sort using a custom compare function', () => {
    const numbers = [5, 3, 9, 1, 4];
    const priorityNumbers = [9, 1];
    const result = sortWithPriority(numbers, priorityNumbers, (a, b) => a - b);
    expect(result).toEqual([1, 9, 3, 4, 5]);
  });
});
