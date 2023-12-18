import * as util from '../codegen/util';

/**
 * Map of value types that should be typecast when assigned to a field.
 * typeSignature is the signature of the type we want to assign.
 * importedType is the type we want to import from @graphprotocol/graph-ts
 */
export const VALUE_TYPECAST_LIST = {
  'address[]': {
    typeSignature: 'Bytes[]',
    importedType: 'Bytes',
  },
} as {
  [valueType: string]: {
    typeSignature: string;
    importedType: string;
  };
};

export const generateFieldAssignment = (key: string[], value: string[], typecastValueAs?: string) =>
  `entity.${key.join('_')} = ${
    typecastValueAs
      ? `changetype<${typecastValueAs}>(event.params.${value.join('.')})`
      : `event.params.${value.join('.')}`
  }`;

export const generateFieldAssignments = ({
  index,
  input,
}: {
  index: number;
  input: any;
}): { fieldAssignments: string[] | string; requiredImports: string[] } => {
  let fieldAssignments: string[] | string;
  const requiredImports: string[] = [];
  if (input.type === 'tuple') {
    fieldAssignments = util
      .unrollTuple({
        value: input,
        index,
        path: [input.name || `param${index}`],
      })
      .map(({ path }: any) => generateFieldAssignment(path, path));
  } else {
    const valueTypecast = VALUE_TYPECAST_LIST[input.type];
    if (valueTypecast) {
      requiredImports.push(valueTypecast.importedType);
    }
    fieldAssignments = generateFieldAssignment(
      [(input.mappedName ?? input.name) || `param${index}`],
      [input.name || `param${index}`],
      valueTypecast?.typeSignature,
    );
  }
  return { fieldAssignments, requiredImports };
};

type BlacklistDictionary = Record<string, string>;

/**
 * Map of input names that are reserved so we do not use them as field names to avoid conflicts
 */
export const INPUT_NAMES_BLACKLIST = {
  /** Related to https://github.com/graphprotocol/graph-tooling/issues/710 */
  id: 'id',
} as const;

export const renameInput = (name: string, subgraphName: string) => {
  const inputMap: BlacklistDictionary = {
    [INPUT_NAMES_BLACKLIST.id]: `${subgraphName}_id`,
  };

  return inputMap?.[name] ?? name;
};

export const generateEventFieldAssignments = (event: any, contractName: string) => {
  return event.inputs.reduce(
    (acc: { fieldAssignments: string[]; requiredImports: string[] }, input: any, index: number) => {
      if (Object.values(INPUT_NAMES_BLACKLIST).includes(input.name)) {
        input.mappedName = renameInput(input.name, contractName ?? 'contract');
      }
      const { fieldAssignments, requiredImports } = generateFieldAssignments({
        input,
        index,
      });
      return {
        fieldAssignments: acc.fieldAssignments.concat(fieldAssignments),
        requiredImports: acc.requiredImports.concat(requiredImports),
      };
    },
    { fieldAssignments: [], requiredImports: [] },
  );
};

export const generateEventIndexingHandlers = (events: any[], contractName: string) => {
  const allRequiredImports: Set<string> = new Set();
  for (const event of events) {
    const { fieldAssignments, requiredImports } = generateEventFieldAssignments(
      event,
      contractName,
    );
    event.fieldAssignments = fieldAssignments;
    if (requiredImports) {
      for (const requiredImport of requiredImports) {
        allRequiredImports.add(requiredImport);
      }
    }
  }

  return `
  import { ${events.map(
    event => `${event._alias} as ${event._alias}Event`,
  )}} from '../generated/${contractName}/${contractName}'
  import { ${events.map(event => event._alias)} } from '../generated/schema'
  ${
    allRequiredImports.size > 0
      ? `import { ${Array.from(allRequiredImports).join(',')} } from '@graphprotocol/graph-ts'`
      : ''
  }

  ${events
    .map(
      event =>
        `
  export function handle${event._alias}(event: ${event._alias}Event): void {
    let entity = new ${event._alias}(event.transaction.hash.concatI32(event.logIndex.toI32()))
    ${event.fieldAssignments.join('\n')}

    entity.blockNumber = event.block.number
    entity.blockTimestamp = event.block.timestamp
    entity.transactionHash = event.transaction.hash

    entity.save()
  }
    `,
    )
    .join('\n')}
`;
};
