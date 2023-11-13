import immutable from 'immutable';
import yaml from 'js-yaml';
import { loadManifest } from '../migrations/util/load-manifest';
import Protocol from '../protocols';

// Loads manifest from file path and returns all:
// - data sources
// - templates
// In a single list.
export const fromFilePath = async (manifestPath: string) => {
  const { dataSources = [], templates = [] } = await loadManifest(manifestPath);

  return dataSources.concat(templates);
};

// Loads manifest from file path and returns all:
// - data sources
// - templates
// In a single list.
export function fromManifestString(manifest: string) {
  // TODO: can we make it typesafe?
  const { dataSources = [], templates = [] } = (yaml.safeLoad(manifest) || {}) as unknown as any;

  return dataSources.concat(templates);
}

const extractDataSourceByType = (
  manifest: immutable.Map<any, any>,
  dataSourceType: string,
  protocol: Protocol,
) =>
  manifest
    .get(dataSourceType, immutable.List())
    .reduce(
      (dataSources: any[], dataSource: any, dataSourceIndex: number) =>
        protocol.isValidKindName(dataSource.get('kind'))
          ? dataSources.push(immutable.Map({ path: [dataSourceType, dataSourceIndex], dataSource }))
          : dataSources,
      immutable.List(),
    );

// Extracts data sources and templates from a immutable manifest data structure
export const fromManifest = (manifest: immutable.Map<any, any>, protocol: Protocol) => {
  const dataSources = extractDataSourceByType(manifest, 'dataSources', protocol);
  const templates = extractDataSourceByType(manifest, 'templates', protocol);

  return dataSources.concat(templates);
};
