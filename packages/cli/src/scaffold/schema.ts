import immutable from 'immutable'
import { ascTypeForProtocol, valueTypeForAsc } from '../codegen/types'
import * as util from '../codegen/util'
import Protocol from '../protocols'

export function abiEvents(abi: { data: immutable.Collection<any, any> }) {
  return (util.disambiguateNames({
    // @ts-expect-error improve typings of disambiguateNames to handle iterables
    values: abi.data.filter(item => item.get('type') === 'event'),
    // @ts-expect-error improve typings of disambiguateNames to handle iterables
    getName: event => event.get('name'),
    // @ts-expect-error improve typings of disambiguateNames to handle iterables
    setName: (event, name) => event.set('_alias', name),
  }) as unknown) as immutable.List<any>
}

export const protocolTypeToGraphQL = (protocol: string, name: string) => {
  let ascType = ascTypeForProtocol(protocol, name)
  return valueTypeForAsc(ascType)
}

export const generateField = ({
  name,
  type,
  protocolName,
}: {
  name: string
  type: string
  protocolName: string
}) => `${name}: ${protocolTypeToGraphQL(protocolName, type)}! # ${type}`

export const generateEventFields = ({
  index,
  input,
  protocolName,
}: {
  index: number
  input: any
  protocolName: string
}) =>
  input.type == 'tuple'
    ? util
        .unrollTuple({ value: input, path: [input.name || `param${index}`], index })
        .map(({ path, type }: any) =>
          generateField({ name: path.join('_'), type, protocolName }),
        )
    : [
        generateField({
          name: input.name || `param${index}`,
          type: input.type,
          protocolName,
        }),
      ]

export const generateEventType = (event: any, protocolName: string) => `type ${
  event._alias
} @entity(immutable: true) {
      id: Bytes!
      ${event.inputs
        .reduce(
          (acc: any[], input: any, index: number) =>
            acc.concat(generateEventFields({ input, index, protocolName })),
          [],
        )
        .join('\n')}
      blockNumber: BigInt!
      blockTimestamp: BigInt!
      transactionHash: Bytes!
    }`

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
}`
  } else {
    return `type ExampleEntity @entity {
  id: ID!
  block: Bytes!
  count: BigInt!
}`
  }
}
