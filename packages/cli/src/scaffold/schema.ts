import { ascTypeForProtocol, valueTypeForAsc } from '../codegen/types'
import * as util from '../codegen/util'
import Protocol from '../protocols'

export const abiEvents = (abi: any) =>
  util.disambiguateNames({
    values: abi.data.filter((item: any) => item.get('type') === 'event'),
    getName: (event: any) => event.get('name'),
    setName: (event: any, name: string) => event.set('_alias', name),
  })

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
