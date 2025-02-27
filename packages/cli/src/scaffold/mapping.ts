import * as util from '../codegen/util.js';

/**
 * Map of value types that need to be changetype'd to their corresponding AssemblyScript type
 */
export const VALUE_TYPECAST_MAP: Record<string, string> = {
  'address[]': 'Bytes[]',
  'tuple[]': 'Bytes[]',
};

export const generateFieldAssignment = (
  key: string[],
  value: string[],
  type: string,
): { assignment: string; imports: string[] } => {
  const safeKey = key.map(k => util.handleReservedWord(k));
  const safeValue = value.map(v => util.handleReservedWord(v));
  const cleanType = type.replace(/\[\d+\]/g, '[]');

  let rightSide = `event.params.${safeValue.join('.')}`;
  const imports = [];

  if (cleanType in VALUE_TYPECAST_MAP) {
    const castTo = VALUE_TYPECAST_MAP[cleanType];
    rightSide = `changetype<${castTo}>(${rightSide})`;
    imports.push(castTo.replace('[]', ''));
  }

  return {
    assignment: `entity.${safeKey.join('_')} = ${rightSide}`,
    imports,
  };
};

export const generateFieldAssignments = ({
  index,
  input,
}: {
  index: number;
  input: any;
}): { assignments: string[]; imports: string[] } => {
  const fields =
    input.type === 'tuple'
      ? util
          .unrollTuple({ value: input, index, path: [input.name || `param${index}`] })
          .map(({ path, type }) => generateFieldAssignment(path, path, type))
      : [
          generateFieldAssignment(
            [(input.mappedName ?? input.name) || `param${index}`],
            [input.name || `param${index}`],
            input.type,
          ),
        ];

  return {
    assignments: fields.map(a => a.assignment),
    imports: fields.map(a => a.imports).flat(),
  };
};

/**
 * Map of input names that are reserved so we do not use them as field names to avoid conflicts
 * see https://github.com/graphprotocol/graph-tooling/issues/710
 * name => mappedName
 */
const NAMES_REMAP_DICTIONARY: Record<string, string> = {
  id: 'internal_id',
  _id: 'internal__id',
} as const;

export const renameNameIfNeeded = (name: string) => {
  return NAMES_REMAP_DICTIONARY[name] ?? name;
};

export const generateEventFieldAssignments = (
  event: any,
  _contractName: string,
): { assignments: string[]; imports: string[] } =>
  event.inputs.reduce(
    (acc: any, input: any, index: number) => {
      input.mappedName = renameNameIfNeeded(input.name);
      const { assignments, imports } = generateFieldAssignments({ input, index });
      return {
        assignments: acc.assignments.concat(assignments),
        imports: acc.imports.concat(imports),
      };
    },
    { assignments: [], imports: [] },
  );

export const generateEventIndexingHandlers = (events: any[], contractName: string) => {
  const eventFieldAssignments = events.map(event => ({
    event,
    ...generateEventFieldAssignments(event, contractName),
  }));
  const allImports = [...new Set(eventFieldAssignments.map(({ imports }) => imports).flat())];

  const eventHandlers = eventFieldAssignments.map(({ event, assignments }) => {
    return `
  export function handle${event._alias}(event: ${event._alias}Event): void {
    let entity = new ${event._alias}(event.transaction.hash.concatI32(event.logIndex.toI32()))
    ${assignments.join('\n')}

    entity.blockNumber = event.block.number
    entity.blockTimestamp = event.block.timestamp
    entity.transactionHash = event.transaction.hash

    entity.save()
  }
    `;
  });

  return `
  import { ${events.map(
    event => `${event._alias} as ${event._alias}Event`,
  )}} from '../generated/${contractName}/${contractName}'
  import { ${events.map(event => event._alias)} } from '../generated/schema'
  ${
    allImports.length > 0
      ? `import { ${allImports.join(', ')} } from '@graphprotocol/graph-ts'`
      : ''
  }

  ${eventHandlers.join('\n')}
`;
};
