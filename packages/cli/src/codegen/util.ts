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
    const name = getName(value, index);
    const counter = collisionCounter.get(name);
    if (counter === undefined) {
      collisionCounter.set(name, 1);
      return setName(value, name);
    }
    collisionCounter.set(name, counter + 1);
    return setName(value, `${name}${counter}`);
  });
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
}) =>
  value.components.reduce((acc: any[], component: any, index: number) => {
    const name = component.name || `value${index}`;
    return acc.concat(
      component.type === 'tuple'
        ? unrollTuple({ path: [...path, name], index, value: component })
        : [{ path: [...path, name], type: component.type }],
    );
  }, []);
