import yaml from "js-yaml";
import immutable from "immutable";
import { loadManifest } from "../migrations/util/load-manifest";
import Protocol from "../protocols";
import { ManifestZodSchema } from "../manifest";

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
  const { dataSources = [], templates = [] } = ((yaml.safeLoad(manifest) ||
    {}) as unknown) as any;

  return dataSources.concat(templates);
}
