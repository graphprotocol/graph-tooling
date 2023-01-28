import * as util from '../codegen/util';

interface BlacklistDictionary {
  [Key: string]: string;
}

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

const renameInput = (name: string, subgraphName: string) => {
  const inputMap: BlacklistDictionary = {
    id: `${subgraphName}_id`,
  };

  return inputMap[name] ?? name;
};

export const generateEventFieldAssignments = (event: any, contractName: string) =>
  event.inputs.reduce((acc: any[], input: any, index: number) => {
    const inputNamesBlacklist = ['id'];

    if (inputNamesBlacklist.includes(input.name)) {
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
