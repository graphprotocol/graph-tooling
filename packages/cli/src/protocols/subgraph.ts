import immutable from "immutable";
import { ManifestZodSchema } from "../manifest";

export interface SubgraphOptions {
  manifest: ManifestZodSchema;
  resolveFile: (path: string) => string;
  protocol?: any;
}

export interface Subgraph extends SubgraphOptions {
  validateManifest(): Array<{ path: string[]; message: string }>;
  handlerTypes(): immutable.List<any>;
}
