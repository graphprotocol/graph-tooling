export function disambiguateNames<T>({
  values,
  getName,
  setName,
}: {
  values: T[];
  getName: (value: T, index: number) => string;
  setName: (value: T, name: string) => void;
}) {
  const collisionCounter = new Map();
  return values.map((value, index) => {
    let name = getName(value, index);
    name = handleReservedWord(name);
    const counter = collisionCounter.get(name);
    if (counter === undefined) {
      collisionCounter.set(name, 1);
      return setName(value, name);
    }
    collisionCounter.set(name, counter + 1);
    return setName(value, `${name}${counter}`);
  });
}

// List of JavaScript reserved words that need to be handled
const RESERVED_WORDS = new Set([
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'super',
  'switch',
  'static',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield'
]);

// Function to handle JavaScript reserved words by appending an underscore
export function handleReservedWord(name: string): string {
  return RESERVED_WORDS.has(name) ? `${name}_` : name;
}

export function isTupleType(t: string) {
  return t === 'tuple';
}

export function containsTupleType(t: string) {
  return isTupleType(t) || isTupleArrayType(t) || isTupleMatrixType(t);
}

export function isTupleArrayType(t: string) {
  return t.match(/^tuple\[([0-9]+)?\]$/);
}

export function isTupleMatrixType(t: string) {
  return t.match(/^tuple\[([0-9]+)?\]\[([0-9]+)?\]$/);
}

export const unrollTuple = ({
  path,
  value,
}: {
  path: string[];
  index: number; // TODO: index is unused, do we really need it?
  value: any;
}): { path: string[]; type: string }[] =>
  value.components.reduce((acc: any[], component: any, index: number) => {
    const name = component.name || `value${index}`;
    return acc.concat(
      component.type === 'tuple'
        ? unrollTuple({ path: [...path, name], index, value: component })
        : [{ path: [...path, name], type: component.type }],
    );
  }, []);
