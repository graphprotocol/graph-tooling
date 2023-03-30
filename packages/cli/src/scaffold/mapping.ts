import * as util from '../codegen/util';

export const generateFieldAssignment = (key: string[], value: string[]) =>
  `entity.${key.join('_')} = event.params.${value.join('.')}`;

export const generateFieldAssignments = ({ index, input }: { index: number; input: any }) =>
  input.type === 'tuple'
    ? util
        .unrollTuple({ value: input, index, path: [input.name || `param${index}`] })
        .map(({ path }: any) => generateFieldAssignment(path, path))
    : generateFieldAssignment(
        [(input.mappedName ?? input.name) || `param${index}`],
        [input.name || `param${index}`],
      );

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

export const generateEventFieldAssignments = (event: any, contractName: string) =>
  event.inputs.reduce((acc: any[], input: any, index: number) => {
    if (Object.values(INPUT_NAMES_BLACKLIST).includes(input.name)) {
      input.mappedName = renameInput(input.name, contractName ?? 'contract');
    }
    return acc.concat(generateFieldAssignments({ input, index }));
  }, []);

export const generateEventIndexingHandlers = (events: any[], contractName: string) =>
  `
  import { ${events.map(
    event => `${event._alias} as ${event._alias}Event`,
  )}} from '../generated/${contractName}/${contractName}'
  import { ${events.map(event => event._alias)} } from '../generated/schema'

  ${events
    .map(
      event =>
        `
  export function handle${event._alias}(event: ${event._alias}Event): void {
    let entity = new ${event._alias}(event.transaction.hash.concatI32(event.logIndex.toI32()))
    ${generateEventFieldAssignments(event, contractName).join('\n')}

    entity.blockNumber = event.block.number
    entity.blockTimestamp = event.block.timestamp
    entity.transactionHash = event.transaction.hash

    entity.save()
  }
    `,
    )
    .join('\n')}
`;
