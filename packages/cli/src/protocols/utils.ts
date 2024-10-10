import type { Manifest } from '@graphprotocol/graph-cli-core';
import debug from '../debug';

export const protocolDebugger = debug('graph-cli:protocol');

export type ProtocolName = 'arweave' | 'ethereum' | 'near' | 'cosmos' | 'substreams';
export type DataSource = Manifest['dataSources'][number];
export type DataSourceKind = Manifest['dataSources'][number]['kind'];
