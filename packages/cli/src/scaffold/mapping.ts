import * as util from '../codegen/util';

export const generateFieldAssignment = (path: string[]) =>
  `entity.${path.join('_')} = event.params.${path.join('.')}`;

export const generateFieldAssignments = ({ index, input }: { index: number; input: any }) =>
  input.type === 'tuple'
    ? util
        .unrollTuple({ value: input, index, path: [input.name || `param${index}`] })
        .map(({ path }: any) => generateFieldAssignment(path))
    : generateFieldAssignment([input.name || `param${index}`]);

export const generateEventFieldAssignments = (event: any) =>
  event.inputs.reduce(
    (acc: any[], input: any, index: number) =>
      acc.concat(generateFieldAssignments({ input, index })),
    [],
  );

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
    ${generateEventFieldAssignments(event).join('\n')}

    entity.blockNumber = event.block.number
    entity.blockTimestamp = event.block.timestamp
    entity.transactionHash = event.transaction.hash

    entity.save()
  }
    `,
    )
    .join('\n')}
`;
