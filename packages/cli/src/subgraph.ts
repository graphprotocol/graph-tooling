import path from 'path';
import fs from 'fs-extra';
import * as graphql from 'graphql/language';
import immutable from 'immutable';
import yaml from 'yaml';
import { strOptions } from 'yaml/types';
import debug from './debug';
import { Subgraph as ISubgraph } from './protocols/subgraph';
import * as validation from './validation';

const subgraphDebug = debug('graph-cli:subgraph');

const throwCombinedError = (filename: string, errors: immutable.List<any>) => {
  throw new Error(
    errors.reduce(
      (msg, e) =>
        `${msg}

  Path: ${e.get('path').size === 0 ? '/' : e.get('path').join(' > ')}
  ${e.get('message').split('\n').join('\n  ')}`,
      `Error in ${path.relative(process.cwd(), filename)}:`,
    ),
  );
};

const buildCombinedWarning = (filename: string, warnings: immutable.List<any>) =>
  warnings.size > 0
    ? warnings.reduce(
        (msg, w) =>
          `${msg}

    Path: ${w.get('path').size === 0 ? '/' : w.get('path').join(' > ')}
    ${w.get('message').split('\n').join('\n    ')}`,
        `Warnings in ${path.relative(process.cwd(), filename)}:`,
      ) + '\n'
    : null;

type ResolveFile = (path: string) => string;

export default class Subgraph {
  static async validate(data: any, protocol: any, { resolveFile }: { resolveFile: ResolveFile }) {
    subgraphDebug.extend('validate')('Validating Subgraph with protocol %M', protocol);
    if (protocol.name == null) {
      subgraphDebug.extend('validate')('Protocol has no name, skipping validation');
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
        path.join(
          __dirname,
          'protocols',
          // TODO: substreams/triggers is a special case, should be handled better
          protocol.name === 'substreams/triggers' ? 'substreams' : protocol.name,
          `manifest.graphql`,
        ),
        'utf-8',
      ),
    );

    // Obtain the root `SubgraphManifest` type from the schema
    const rootType = schema.definitions.find(definition => {
      // @ts-expect-error TODO: name field does not exist on definition, really?
      return definition.name.value === 'SubgraphManifest';
    });

    // Validate the subgraph manifest using this schema
    return validation.validateManifest(data, rootType, schema, protocol, {
      resolveFile,
    });
  }

  static validateSchema(manifest: any, { resolveFile }: { resolveFile: ResolveFile }) {
    subgraphDebug.extend('validate')('Validating schema in manifest');
    const filename = resolveFile(manifest.getIn(['schema', 'file']));
    subgraphDebug.extend('validate')('Loaded schema from %s', filename);
    const validationErrors = validation.validateSchema(filename);
    let errors: immutable.Collection<any, any>;

    if (validationErrors.size > 0) {
      subgraphDebug.extend('validate')('Schema validation failed for %s', filename);
      errors = validationErrors.groupBy(error => error.get('entity')).sort();
      const msg = errors.reduce(
        (msg, errors, entity) => {
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
        },
        `Error in ${path.relative(process.cwd(), filename)}:`,
      );

      throw new Error(msg);
    }
  }

  static validateRepository(manifest: immutable.Collection<any, any>) {
    subgraphDebug.extend('validate')('Validating repository in manifest');
    const repository = manifest.get('repository');

    return /^https:\/\/github\.com\/graphprotocol\/graph-tooling?$/.test(repository) ||
      // For legacy reasons, we should error on example subgraphs
      /^https:\/\/github\.com\/graphprotocol\/example-subgraphs?$/.test(repository)
      ? immutable.List().push(
          immutable.fromJS({
            path: ['repository'],
            message: `\
The repository is still set to ${repository}.
Please replace it with a link to your subgraph source code.`,
          }),
        )
      : immutable.List();
  }

  static validateDescription(manifest: immutable.Collection<any, any>) {
    subgraphDebug.extend('validate')('Validating description in manifest');
    // TODO: Maybe implement this in the future for each protocol example description
    return manifest.get('description', '').startsWith('Gravatar for ')
      ? immutable.List().push(
          immutable.fromJS({
            path: ['description'],
            message: `\
The description is still the one from the example subgraph.
Please update it to tell users more about your subgraph.`,
          }),
        )
      : immutable.List();
  }

  static validateHandlers(
    manifest: immutable.Collection<any, any>,
    protocol: any,
    protocolSubgraph: ISubgraph,
  ) {
    subgraphDebug.extend('validate')('Validating handlers for protocol %s', protocol?.name);
    return manifest
      .get('dataSources')
      .filter((dataSource: any) => protocol.isValidKindName(dataSource.get('kind')))
      .reduce((errors: any, dataSource: any, dataSourceIndex: any) => {
        const path = ['dataSources', dataSourceIndex, 'mapping'];
        const mapping = dataSource.get('mapping');
        const handlerTypes = protocolSubgraph.handlerTypes();

        subgraphDebug.extend('validate')(
          'Validating dataSource "%s" handlers with %d handlers types defined for protocol',
          dataSource.get('name'),
          handlerTypes.size,
        );

        if (handlerTypes.size == 0) {
          return errors;
        }

        const areAllHandlersEmpty = handlerTypes
          .map((handlerType: any) => mapping.get(handlerType, immutable.List()))
          .every((handlers: immutable.List<any>) => handlers.isEmpty());

        const handlerNamesWithoutLast = handlerTypes.pop().join(', ');

        return areAllHandlersEmpty
          ? errors.push(
              immutable.fromJS({
                path,
                message: `\
Mapping has no ${handlerNamesWithoutLast} or ${handlerTypes.get(-1)}.
At least one such handler must be defined.`,
              }),
            )
          : errors;
      }, immutable.List());
  }

  static validateContractValues(manifest: any, protocol: any) {
    subgraphDebug.extend('validate')('Validating contract values for protocol %s', protocol?.name);
    if (!protocol.hasContract()) {
      subgraphDebug.extend('validate')('Protocol has no contract, skipping validation');
      return immutable.List();
    }

    return validation.validateContractValues(manifest, protocol);
  }

  // Validate that data source names are unique, so they don't overwrite each other.
  static validateUniqueDataSourceNames(manifest: any) {
    subgraphDebug.extend('validate')('Validating that data source names are unique');
    const names: any[] = [];
    return manifest
      .get('dataSources')
      .reduce((errors: immutable.List<any>, dataSource: any, dataSourceIndex: number) => {
        const path = ['dataSources', dataSourceIndex, 'name'];
        const name = dataSource.get('name');
        if (names.includes(name)) {
          subgraphDebug.extend('validate')("Found duplicate data source name '%s', adding error");
          errors = errors.push(
            immutable.fromJS({
              path,
              message: `\
More than one data source named '${name}', data source names must be unique.`,
            }),
          );
        }
        names.push(name);
        return errors;
      }, immutable.List());
  }

  static validateUniqueTemplateNames(manifest: any) {
    subgraphDebug.extend('validate')('Validating that template names are unique');
    const names: any[] = [];
    return manifest
      .get('templates', immutable.List())
      .reduce((errors: immutable.List<any>, template: any, templateIndex: number) => {
        const path = ['templates', templateIndex, 'name'];
        const name = template.get('name');
        if (names.includes(name)) {
          subgraphDebug.extend('validate')("Found duplicate template name '%s', adding error");
          errors = errors.push(
            immutable.fromJS({
              path,
              message: `\
More than one template named '${name}', template names must be unique.`,
            }),
          );
        }
        names.push(name);
        return errors;
      }, immutable.List());
  }

  static dump(manifest: any) {
    strOptions.fold.lineWidth = 90;
    // @ts-expect-error TODO: plain is the value behind the TS constant
    strOptions.defaultType = 'PLAIN';

    return yaml.stringify(manifest.toJS());
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
      subgraphDebug('Loading manifest from %s', filename);
      const raw_data = await fs.readFile(filename, 'utf-8');
      subgraphDebug('Checking for file data sources in %s', filename);
      has_file_data_sources = raw_data.includes('kind: file');
      subgraphDebug('Parsing manifest from %s', filename);
      data = yaml.parse(raw_data);
    }

    // Helper to resolve files relative to the subgraph manifest
    const resolveFile: ResolveFile = maybeRelativeFile =>
      path.resolve(path.dirname(filename), maybeRelativeFile);

    // TODO: Validation for file data sources
    if (!has_file_data_sources) {
      subgraphDebug('Validating manifest from %s', filename);
      const manifestErrors = await Subgraph.validate(data, protocol, {
        resolveFile,
      });

      if (manifestErrors.size > 0) {
        subgraphDebug('Manifest validation failed for %s', filename);
        throwCombinedError(filename, manifestErrors);
      }
    }

    const manifest = immutable.fromJS(data) as immutable.Map<any, any>;
    subgraphDebug.extend('manifest')('Loaded: %M', manifest);

    // Validate the schema
    subgraphDebug.extend('manifest')('Validating schema');
    Subgraph.validateSchema(manifest, { resolveFile });

    // Perform other validations
    const protocolSubgraph = protocol.getSubgraph({
      manifest,
      resolveFile,
    });

    const errors = skipValidation
      ? immutable.List()
      : immutable.List.of(
          ...protocolSubgraph.validateManifest(),
          ...Subgraph.validateContractValues(manifest, protocol),
          ...Subgraph.validateUniqueDataSourceNames(manifest),
          ...Subgraph.validateUniqueTemplateNames(manifest),
          ...Subgraph.validateHandlers(manifest, protocol, protocolSubgraph),
        );

    if (errors.size > 0) {
      throwCombinedError(filename, errors);
    }

    // Perform warning validations
    const warnings = skipValidation
      ? immutable.List()
      : immutable.List.of(
          ...Subgraph.validateRepository(manifest),
          ...Subgraph.validateDescription(manifest),
        );

    return {
      result: manifest,
      warning: warnings.size > 0 ? buildCombinedWarning(filename, warnings) : null,
    };
  }

  static async write(manifest: any, filename: string) {
    await fs.writeFile(filename, Subgraph.dump(manifest));
  }
}
