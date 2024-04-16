/**
 * Sorts an array with specified elements given priority.
 * Use a predicate function, or provide an array to prioritise elements.
 * If no compare function is provided, default JS sorting (ascending) behaviour prevails.
 *
 * @param {T[]} array - The array to be sorted.
 * @param {((element: T) => boolean) | T[]} prioritySpecifier - A function that returns true if an element should be prioritized, or an array of elements to be prioritized.
 * @param {(a: T, b: T) => number} [compareFunction] - An optional comparison function to sort the elements of the array. If omitted, the array is sorted in default order.
 * @returns {T[]} The sorted array with priority elements first.
 *
 * @example
 * const numbers = [5, 3, 9, 1, 4];
 * sortWithPriority(numbers, x => x > 5); // [9, 1, 3, 4, 5]
 * sortWithPriority(numbers, [9, 1]); // [1, 9, 3, 4, 5]
 */
function sortWithPriority<T>(
  array: T[],
  prioritySpecifier?: ((element: T) => boolean) | T[],
  compareFunction?: (a: T, b: T) => number
): T[] {
  // prioritySpecifier can be an array or a function so handle each case
  let isPriorityElement: (element: T) => boolean;

  if (Array.isArray(prioritySpecifier) || !prioritySpecifier) {
    const prioritySet = new Set(prioritySpecifier ?? []);
    isPriorityElement = (element: T) => prioritySet.has(element);
  } else {
    isPriorityElement = prioritySpecifier;
  }

  const priorityArray = array.filter(isPriorityElement);
  const regularArray = array.filter(item => !isPriorityElement(item));

  if (compareFunction) {
    priorityArray.sort(compareFunction);
    regularArray.sort(compareFunction);
  } else {
    priorityArray.sort();
    regularArray.sort();
  }

  return priorityArray.concat(regularArray);
}

export { sortWithPriority }