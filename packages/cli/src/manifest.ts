import { z } from 'zod';

// https://github.com/graphprotocol/graph-node/blob/master/docs/subgraph-manifest.md#14-schema
const Schema = z.object({
  file: z.string().describe('The path of the GraphQL IDL file, either local or on IPFS.'),
});

// https://github.com/graphprotocol/graph-node/blob/master/docs/subgraph-manifest.md#151-ethereumcontractsource
const EthereumContractSource = z.object({
  address: z.string(),
  abi: z.string(),
  startBlock: z.bigint().optional(),
});

// https://github.com/graphprotocol/graph-node/blob/master/docs/subgraph-manifest.md#1522-eventhandler
const EventHandler = z.object({
  event: z
    .string()
    .describe(
      'An identifier for an event that will be handled in the mapping script. For Ethereum contracts, this must be the full event signature to distinguish from events that may share the same name. No alias types can be used.',
    ),
  handler: z
    .string()
    .describe(
      'The name of an exported function in the mapping script that should handle the specified event.',
    ),
  topic0: z
    .string()
    .optional()
    .describe(
      'A 0x prefixed hex string. If provided, events whose topic0 is equal to this value will be processed by the given handler. When topic0 is provided, only the topic0 value will be matched, and not the hash of the event signature. This is useful for processing anonymous events in Solidity, which can have their topic0 set to anything. By default, topic0 is equal to the hash of the event signature.',
    ),
});

// https://github.com/graphprotocol/graph-node/blob/master/docs/subgraph-manifest.md#1523-callhandler
const CallHandler = z.object({
  function: z
    .string()
    .describe(
      'An identifier for a function that will be handled in the mapping script. For Ethereum contracts, this is the normalized function signature to filter calls by.',
    ),
  handler: z
    .string()
    .describe(
      'The name of an exported function in the mapping script that should handle the specified event.',
    ),
});

// https://github.com/graphprotocol/graph-node/blob/master/docs/subgraph-manifest.md#15241-blockhandlerfilter
const BlockHandlerFilter = z.object({
  kind: z.literal('call').describe('The selected block handler filter.'),
});

// https://github.com/graphprotocol/graph-node/blob/master/docs/subgraph-manifest.md#1524-blockhandler
const BlockHandler = z.object({
  handler: z
    .string()
    .describe(
      'The name of an exported function in the mapping script that should handle the specified event.',
    ),
  filter: BlockHandlerFilter.optional().describe(
    'Definition of the filter to apply. If none is supplied, the handler will be called on every block.',
  ),
});

// https://github.com/graphprotocol/graph-node/blob/master/docs/subgraph-manifest.md#1521-ethereum-mapping
const EthereumMapping = z.object({
  kind: z
    .literal('ethereum/events')
    .describe('Must be "ethereum/events" for Ethereum Events Mapping.'),
  apiVersion: z
    .string()
    .describe(
      'Semver string of the version of the Mappings API that will be used by the mapping script.',
    ),
  language: z
    .literal('wasm/assemblyscript')
    .describe('The language of the runtime for the Mapping API.'),
  entities: z
    .array(z.string())
    .describe(
      'A list of entities that will be ingested as part of this mapping. Must correspond to names of entities in the GraphQL IDL.',
    ),
  eventHandlers: z
    .array(EventHandler)
    .optional()
    .describe('Handlers for specific events, which will be defined in the mapping script.'),
  callHandlers: z
    .array(CallHandler)
    .optional()
    .describe(
      'A list of functions that will trigger a handler and the name of the corresponding handlers in the mapping.',
    ),
  blockHandlers: z
    .array(BlockHandler)
    .optional()
    .describe('Defines block filters and handlers to process matching blocks.'),
  file: z.string().describe('The path of the mapping script.'),
});

// https://github.com/graphprotocol/graph-node/blob/master/docs/subgraph-manifest.md#152-mapping
const Mapping = EthereumMapping;

// https://github.com/graphprotocol/graph-node/blob/master/docs/subgraph-manifest.md#15-data-source
const DataSource = z.object({
  kind: z.string().describe('The type of data source. Possible values: ethereum/contract.'),
  name: z
    .string()
    .describe(
      'The name of the source data. Will be used to generate APIs in the mapping and also for self-documentation purposes.',
    ),
  network: z
    .string()
    .describe('For blockchains, this describes which network the subgraph targets'),
  source: EthereumContractSource.describe('The source data on a blockchain such as Ethereum.'),
  mapping: Mapping.describe('The mapping that defines how to ingest the data.'),
});

// https://github.com/graphprotocol/graph-node/blob/master/docs/subgraph-manifest.md#18-graft-base
const GraftBase = z.object({
  base: z.string().describe('The subgraph ID of the base subgraph'),
  block: z.bigint().describe('The block number up to which to use data from the base subgraph'),
});

// https://github.com/graphprotocol/graph-node/blob/master/docs/subgraph-manifest.md#13-top-level-api
export const Manifest = z.object({
  specVersion: z
    .string()
    .describe('A Semver version indicating which version of this API is being used.'),
  schema: Schema.describe('The GraphQL schema of this subgraph.'),
  description: z.string().describe("An optional description of the subgraph's purpose.").optional(),
  repository: z.string().describe('An optional link to where the subgraph lives.').optional(),
  graft: GraftBase.describe('An optional base to graft onto.').optional(),
  dataSources: z
    .array(DataSource)
    .describe(
      "Each data source spec defines the data that will be ingested as well as the transformation logic to derive the state of the subgraph's entities based on the source data.",
    ),
});
