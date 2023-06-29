import path from 'path';
import fs from 'fs-extra';
import * as graphql from 'graphql/language';
import immutable from 'immutable';
import yaml from 'yaml';
import { strOptions } from 'yaml/types';
import debug from './debug';
import { Subgraph as ISubgraph } from './protocols/subgraph';
import * as validation from './validation';
import { Manifest, ManifestZodSchema } from './manifest';

const subgraphDebug = debug('graph-cli:subgraph');

const throwCombinedError = (filename: string, errors: Array<{ path: any[]; message: string }>) => {
  throw new Error(
    errors.reduce(
      (msg, e) =>
        `${msg}

  Path: ${e.path.length === 0 ? '/' : e.path.join(' > ')}
  ${e.message.split('\n').join('\n  ')}`,
      `Error in ${path.relative(process.cwd(), filename)}:`,
    ),
  );
};

const buildCombinedWarning = (
  filename: string,
  warnings: Array<{ path: any[]; message: string }>,
) =>
  warnings.length > 0
    ? warnings.reduce(
        (msg, w) =>
          `${msg}

    Path: ${w.path.length === 0 ? '/' : w.path.join(' > ')}
    ${w.message.split('\n').join('\n    ')}`,
        `Warnings in ${path.relative(process.cwd(), filename)}:`,
      ) + '\n'
    : null;

type ResolveFile = (path: string) => string;

export default class Subgraph {
  static async validate(data: any, protocol: any, { resolveFile }: { resolveFile: ResolveFile }) {
    subgraphDebug(`Validating Subgraph with protocol "%s"`, protocol);
    if (protocol.name == null) {
      return immutable.fromJS([
        {
          path: [],
          message: `Unable to determine for which protocol manifest file is built for. Ensure you have at least one 'dataSources' and/or 'templates' elements defined in your subgraph.`,
        },
      ]);
    }

    // Parse the default subgraph schema
    const schema = graphql.parse(
      await fs.readFile(
        path.join(__dirname, 'protocols', protocol.name, `manifest.graphql`),
        'utf-8',
      ),
    );

    // Obtain the root `SubgraphManifest` type from the schema
    const rootType = schema.definitions.find(definition => {
      // @ts-expect-error TODO: name field does not exist on definition, really?
      return definition.name.value === 'SubgraphManifest';
    });

    // Validate the subgraph manifest using this schema
    return validation.validateManifest(data, rootType, schema, protocol, { resolveFile });
  }

  static validateSchema(manifest: any, { resolveFile }: { resolveFile: ResolveFile }) {
    const filename = resolveFile(manifest.getIn(['schema', 'file']));
    const validationErrors = validation.validateSchema(filename);
    let errors: immutable.Collection<any, any>;

    if (validationErrors.size > 0) {
      errors = validationErrors.groupBy(error => error.get('entity')).sort();
      const msg = errors.reduce((msg, errors, entity) => {
        errors = errors.groupBy((error: any) => error.get('directive'));
        const inner_msgs = errors.reduce((msg: string, errors: any[], directive: string) => {
          return `${msg}${
            directive
              ? `
    ${directive}:`
              : ''
          }
  ${errors
    .map(error => error.get('message').split('\n').join('\n  '))
    .map(msg => `${directive ? '  ' : ''}- ${msg}`)
    .join('\n  ')}`;
        }, ``);
        return `${msg}

  ${entity}:${inner_msgs}`;
      }, `Error in ${path.relative(process.cwd(), filename)}:`);

      throw new Error(msg);
    }
  }

  static validateRepository(manifest: ManifestZodSchema) {
    const repository = manifest.repository;

    // repository is optional, so no need to throw error if it's not set
    if (!repository) return [];

    return /^https:\/\/github\.com\/graphprotocol\/graph-tooling?$/.test(repository) ||
      // For legacy reasons, we should error on example subgraphs
      /^https:\/\/github\.com\/graphprotocol\/example-subgraphs?$/.test(repository)
      ? [
          {
            path: ['repository'],
            message: `\
The repository is still set to ${repository}.
Please replace it with a link to your subgraph source code.`,
          },
        ]
      : [];
  }

  static validateDescription(manifest: ManifestZodSchema) {
    // TODO: Maybe implement this in the future for each protocol example description
    return (manifest?.description || '').startsWith('Gravatar for ')
      ? [
          {
            path: ['description'],
            message: `\
The description is still the one from the example subgraph.
Please update it to tell users more about your subgraph.`,
          },
        ]
      : [];
  }

  static validateHandlers(manifest: ManifestZodSchema, protocol: any, protocolSubgraph: ISubgraph) {
    return manifest.dataSources
      .filter(dataSource => protocol.isValidKindName(dataSource.kind))
      .reduce((errors: any, dataSource, dataSourceIndex: number) => {
        const path = ['dataSources', dataSourceIndex, 'mapping'];
        const mapping = dataSource.mapping;
        const handlerTypes = protocolSubgraph.handlerTypes();

        subgraphDebug(
          'Validating dataSource "%s" handlers with %d handlers types defined for protocol',
          dataSource.name,
          handlerTypes.size,
        );

        if (handlerTypes.size == 0) {
          return errors;
        }

        const areAllHandlersEmpty = handlerTypes
          // @ts-expect-error TODO: handlerTypes needs to be improved
          .map(handlerType => mapping?.[handlerType] || [])
          .every(handlers => handlers.length === 0);

        const handlerNamesWithoutLast = handlerTypes.pop().join(', ');

        return areAllHandlersEmpty
          ? errors.push({
              path,
              message: `\
Mapping has no ${handlerNamesWithoutLast} or ${handlerTypes.get(-1)}.
At least one such handler must be defined.`,
            })
          : errors;
      }, []);
  }

  static validateContractValues(manifest: ManifestZodSchema, protocol: any) {
    if (!protocol.hasContract()) {
      return [];
    }

    return validation.validateContractValues(manifest, protocol);
  }

  // Validate that data source names are unique, so they don't overwrite each other.
  static validateUniqueDataSourceNames(manifest: ManifestZodSchema) {
    const names: string[] = [];
    return manifest.dataSources.reduce((errors: any, dataSource, dataSourceIndex) => {
      const path = ['dataSources', dataSourceIndex, 'name'];
      const name = dataSource.name;
      if (names.includes(name)) {
        errors = errors.push({
          path,
          message: `\
More than one data source named '${name}', data source names must be unique.`,
        });
      }
      names.push(name);
      return errors;
    }, []);
  }

  static validateUniqueTemplateNames(manifest: ManifestZodSchema) {
    const names: string[] = [];
    return (manifest?.templates || []).reduce((errors: any, template, templateIndex) => {
      const path = ['templates', templateIndex, 'name'];
      const name = template.name;

      if (names.includes(name)) {
        errors = errors.push({
          path,
          message: `\
More than one template named '${name}', template names must be unique.`,
        });
      }
      names.push(name);

      return errors;
    }, []);
  }

  static dump(manifest: ManifestZodSchema) {
    strOptions.fold.lineWidth = 90;
    // @ts-expect-error TODO: plain is the value behind the TS constant
    strOptions.defaultType = 'PLAIN';

    return yaml.stringify(manifest);
  }

  static async load(
    filename: string,
    { protocol, skipValidation }: { protocol?: any; skipValidation?: boolean } = {
      skipValidation: false,
    },
  ) {
    // Load and validate the manifest
    let data = null;
    let has_file_data_sources = false;

    if (filename.match(/.js$/)) {
      data = require(path.resolve(filename));
    } else {
      const raw_data = await fs.readFile(filename, 'utf-8');
      has_file_data_sources = raw_data.includes('kind: file');
      data = yaml.parse(raw_data);
    }

    // Helper to resolve files relative to the subgraph manifest
    const resolveFile: ResolveFile = maybeRelativeFile =>
      path.resolve(path.dirname(filename), maybeRelativeFile);

    // TODO: Validation for file data sources
    if (!has_file_data_sources) {
      const manifestErrors = await Subgraph.validate(data, protocol, { resolveFile });
      if (manifestErrors.size > 0) {
        throwCombinedError(filename, manifestErrors);
      }
    }
    const manifestSchema = Manifest.safeParse(data);
    if (!manifestSchema.success) {
      throw new Error(manifestSchema.error.message);
    }
    const manifest = manifestSchema.data;

    // Validate the schema
    Subgraph.validateSchema(manifest, { resolveFile });

    // Perform other validations
    const protocolSubgraph = protocol.getSubgraph({
      manifest,
      resolveFile,
    });

    const errors = skipValidation
      ? []
      : [
          ...protocolSubgraph.validateManifest(),
          ...Subgraph.validateContractValues(manifest, protocol),
          ...Subgraph.validateUniqueDataSourceNames(manifest),
          ...Subgraph.validateUniqueTemplateNames(manifest),
          ...Subgraph.validateHandlers(manifest, protocol, protocolSubgraph),
        ];

    if (errors.length > 0) {
      throwCombinedError(filename, errors);
    }

    // Perform warning validations
    const warnings = skipValidation
      ? []
      : [...Subgraph.validateRepository(manifest), ...Subgraph.validateDescription(manifest)];

    return {
      result: manifest,
      warning: warnings.length > 0 ? buildCombinedWarning(filename, warnings) : null,
    };
  }

  static async write(manifest: any, filename: string) {
    await fs.writeFile(filename, Subgraph.dump(manifest));
  }
}
