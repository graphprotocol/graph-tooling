import immutable from 'immutable';
import { ascTypeForProtocol, valueTypeForAsc } from '../codegen/types';
import * as util from '../codegen/util';
import Protocol from '../protocols';
import { INPUT_NAMES_BLACKLIST, renameInput } from './mapping';

export function abiEvents(abi: { data: immutable.Collection<any, any> }) {
  return util.disambiguateNames({
    // @ts-expect-error improve typings of disambiguateNames to handle iterables
    values: abi.data.filter(item => item.get('type') === 'event'),
    // @ts-expect-error improve typings of disambiguateNames to handle iterables
    getName: event => event.get('name'),
    // @ts-expect-error improve typings of disambiguateNames to handle iterables
    setName: (event, name) => event.set('_alias', name),
  }) as unknown as immutable.List<any>;
}

export const protocolTypeToGraphQL = (protocol: string, name: string) => {
  const ascType = ascTypeForProtocol(protocol, name);
  // TODO: we need to figure out how to improve types
  // but for now this always is returning a string
  const convertedType = valueTypeForAsc(ascType) as string;

  // TODO: this is a hack to make array type non-nullable
  // We should refactor the way we convert the Values from ASC to GraphQL
  // For arrays we always want non-nullable children
  return convertedType.endsWith(']') ? convertedType.replace(/\]/g, '!]') : convertedType;
};

export const generateField = ({
  name,
  type,
  protocolName,
}: {
  name: string;
  type: string;
  protocolName: string;
}) => `${name}: ${protocolTypeToGraphQL(protocolName, type)}! # ${type}`;

export const generateEventFields = ({
  index,
  input,
  protocolName,
}: {
  index: number;
  input: any;
  protocolName: string;
}) =>
  input.type == 'tuple'
    ? util
        .unrollTuple({
          value: input,
          path: [input.name || `param${index}`],
          index,
        })
        .map(({ path, type }: any) => generateField({ name: path.join('_'), type, protocolName }))
    : [
        generateField({
          name: input.name || `param${index}`,
          type: input.type,
          protocolName,
        }),
      ];

export const generateEventType = (
  event: any,
  protocolName: string,
  contractName: string | undefined,
) => {
  return `type ${
    event.collision ? `${contractName}${event._alias}` : event._alias
  } @entity(immutable: true) {
        id: Bytes!
        ${event.inputs
          .reduce((acc: any[], input: any, index: number) => {
            if (Object.values(INPUT_NAMES_BLACKLIST).includes(input.name)) {
              input.name = renameInput(input.name, contractName ?? 'contract');
            }
            return acc.concat(generateEventFields({ input, index, protocolName }));
          }, [])
          .join('\n')}
        blockNumber: BigInt!
        blockTimestamp: BigInt!
        transactionHash: Bytes!
      }`;
};

export const generateExampleEntityType = (protocol: Protocol, events: any[]) => {
  if (protocol.hasABIs() && events.length > 0) {
    return `type ExampleEntity @entity {
  id: Bytes!
  count: BigInt!
  ${events[0].inputs
    .reduce(
      (acc: any[], input: any, index: number) =>
        acc.concat(generateEventFields({ input, index, protocolName: protocol.name })),
      [],
    )
    .slice(0, 2)
    .join('\n')}
}`;
  }
  return `type ExampleEntity @entity {
  id: ID!
  block: Bytes!
  count: BigInt!
}`;
};
