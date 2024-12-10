import * as util from '../codegen/util.js';

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

export const generateEventFieldAssignments = (event: any, _contractName: string) =>
  event.inputs.reduce((acc: any[], input: any, index: number) => {
    input.mappedName = renameNameIfNeeded(input.name);
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
