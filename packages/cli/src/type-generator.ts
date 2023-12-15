import path from 'path';
import fs from 'fs-extra';
import * as toolbox from 'gluegun';
import * as graphql from 'graphql/language';
import immutable from 'immutable';
import prettier from 'prettier';
// @ts-expect-error TODO: type out if necessary
import uncrashable from '@float-capital/float-subgraph-uncrashable/src/Index.bs.js';
import DataSourceTemplateCodeGenerator from './codegen/template';
import { GENERATED_FILE_NOTE, ModuleImports } from './codegen/typescript';
import { displayPath } from './command-helpers/fs';
import { Spinner, step, withSpinner } from './command-helpers/spinner';
import debug from './debug';
import { applyMigrations } from './migrations';
import Protocol from './protocols';
import Schema from './schema';
import Subgraph from './subgraph';
import Watcher from './watcher';

const typeGenDebug = debug('graph-cli:type-generator');

export interface TypeGeneratorOptions {
  sourceDir?: string;
  subgraphManifest: string;
  subgraph?: string;
  protocol: Protocol;
  outputDir: string;
  skipMigrations?: boolean;
  uncrashable: boolean;
  uncrashableConfig: string;
}

export default class TypeGenerator {
  private sourceDir: string;
  private options: TypeGeneratorOptions;
  private protocol: Protocol;
  private protocolTypeGenerator: any;

  constructor(options: TypeGeneratorOptions) {
    this.options = options;
    this.sourceDir =
      this.options.sourceDir ||
      (this.options.subgraphManifest && path.dirname(this.options.subgraphManifest));

    this.protocol = this.options.protocol;
    this.protocolTypeGenerator = this.protocol?.getTypeGenerator?.({
      sourceDir: this.sourceDir,
      outputDir: this.options.outputDir,
    });

    process.on('uncaughtException', e => {
      toolbox.print.error(`UNCAUGHT EXCEPTION: ${e}`);
    });
  }

  async generateTypes() {
    if (this.protocol.name === 'substreams') {
      typeGenDebug.extend('generateTypes')(
        'Subgraph uses a substream datasource. Skipping code generation.',
      );
      toolbox.print.success(
        'Subgraph uses a substream datasource. Codegeneration is not required.',
      );
      process.exit(0);
      return;
    }

    try {
      if (!this.options.skipMigrations && this.options.subgraphManifest) {
        await applyMigrations({
          sourceDir: this.sourceDir,
          manifestFile: this.options.subgraphManifest,
        });
      }
      const subgraph = await this.loadSubgraph();

      // Not all protocols support/have ABIs.
      if (this.protocol.hasABIs()) {
        typeGenDebug.extend('generateTypes')('Generating types for ABIs');
        const abis = await this.protocolTypeGenerator.loadABIs(subgraph);
        await this.protocolTypeGenerator.generateTypesForABIs(abis);
      }

      typeGenDebug.extend('generateTypes')('Generating types for templates');
      await this.generateTypesForDataSourceTemplates(subgraph);

      // Not all protocols support/have ABIs.
      if (this.protocol.hasABIs()) {
        const templateAbis = await this.protocolTypeGenerator.loadDataSourceTemplateABIs(subgraph);
        await this.protocolTypeGenerator.generateTypesForDataSourceTemplateABIs(templateAbis);
      }

      const schema = await this.loadSchema(subgraph);
      typeGenDebug.extend('generateTypes')('Generating types for schema');
      await this.generateTypesForSchema(schema);

      toolbox.print.success('\nTypes generated successfully\n');

      if (this.options.uncrashable && this.options.uncrashableConfig) {
        await this.generateUncrashableEntities(schema);
        toolbox.print.success('\nUncrashable Helpers generated successfully\n');
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  async generateUncrashableEntities(graphSchema: any) {
    const ast = graphql.parse(graphSchema.document);
    const entityDefinitions = ast['definitions'];
    return await withSpinner(
      `Generate Uncrashable Entity Helpers`,
      `Failed to generate Uncrashable Entity Helpers`,
      `Warnings while generating Uncrashable Entity Helpers`,
      async spinner => {
        uncrashable.run(entityDefinitions, this.options.uncrashableConfig, this.options.outputDir);
        const outputFile = path.join(this.options.outputDir, 'UncrashableEntityHelpers.ts');
        step(spinner, 'Save uncrashable entities to', displayPath(outputFile));
      },
    );
  }

  async loadSubgraph({ quiet } = { quiet: false }) {
    const subgraphLoadOptions = {
      protocol: this.protocol,
      skipValidation: false,
    };

    if (quiet) {
      return (
        this.options.subgraph ||
        (await Subgraph.load(this.options.subgraphManifest, subgraphLoadOptions)).result
      );
    }
    const manifestPath = displayPath(this.options.subgraphManifest);

    return await withSpinner(
      `Load subgraph from ${manifestPath}`,
      `Failed to load subgraph from ${manifestPath}`,
      `Warnings while loading subgraph from ${manifestPath}`,
      async _spinner => {
        return (
          this.options.subgraph || Subgraph.load(this.options.subgraphManifest, subgraphLoadOptions)
        );
      },
    );
  }

  async loadSchema(subgraph: immutable.Map<any, any>) {
    const maybeRelativePath = subgraph.getIn(['schema', 'file']) as string;
    const absolutePath = path.resolve(this.sourceDir, maybeRelativePath);
    return await withSpinner(
      `Load GraphQL schema from ${displayPath(absolutePath)}`,
      `Failed to load GraphQL schema from ${displayPath(absolutePath)}`,
      `Warnings while loading GraphQL schema from ${displayPath(absolutePath)}`,
      async _spinner => {
        const absolutePath = path.resolve(this.sourceDir, maybeRelativePath);
        return Schema.load(absolutePath);
      },
    );
  }

  async generateTypesForSchema(schema: any) {
    return await withSpinner(
      `Generate types for GraphQL schema`,
      `Failed to generate types for GraphQL schema`,
      `Warnings while generating types for GraphQL schema`,
      async spinner => {
        // Generate TypeScript module from schema
        const codeGenerator = schema.codeGenerator();
        const code = await prettier.format(
          [
            GENERATED_FILE_NOTE,
            ...codeGenerator.generateModuleImports(),
            ...codeGenerator.generateTypes(),
            ...codeGenerator.generateDerivedLoaders(),
          ].join('\n'),
          {
            parser: 'typescript',
          },
        );

        const outputFile = path.join(this.options.outputDir, 'schema.ts');
        step(spinner, 'Write types to', displayPath(outputFile));
        await fs.mkdirs(path.dirname(outputFile));
        await fs.writeFile(outputFile, code);
      },
    );
  }

  async generateTypesForDataSourceTemplates(subgraph: immutable.Map<any, any>) {
    const moduleImports: ModuleImports[] = [];
    return await withSpinner(
      `Generate types for data source templates`,
      `Failed to generate types for data source templates`,
      `Warnings while generating types for data source templates`,
      async spinner => {
        // Combine the generated code for all templates
        const codeSegments = subgraph
          .get('templates', immutable.List())
          .reduce((codeSegments: any, template: any) => {
            step(spinner, 'Generate types for data source template', String(template.get('name')));
            const codeGenerator = new DataSourceTemplateCodeGenerator(template, this.protocol);

            // we want to get all the imports from the templates
            moduleImports.push(...codeGenerator.generateModuleImports());

            return codeSegments.concat(codeGenerator.generateTypes());
          }, immutable.List());

        // we want to dedupe the imports from the templates
        const dedupeModulesImports = moduleImports.reduce(
          (acc: ModuleImports[], curr: ModuleImports) => {
            const found = acc.find(item => item.module === curr.module);
            if (found) {
              const foundNames = Array.isArray(found.nameOrNames)
                ? found.nameOrNames
                : [found.nameOrNames];
              const currNames = Array.isArray(curr.nameOrNames)
                ? curr.nameOrNames
                : [curr.nameOrNames];
              const names = new Set([...foundNames, ...currNames]);
              found.nameOrNames = Array.from(names);
            } else {
              acc.push(curr);
            }
            return acc;
          },
          [],
        );

        if (!codeSegments.isEmpty()) {
          const code = await prettier.format(
            [GENERATED_FILE_NOTE, ...dedupeModulesImports, ...codeSegments].join('\n'),
            {
              parser: 'typescript',
            },
          );

          const outputFile = path.join(this.options.outputDir, 'templates.ts');
          step(spinner, `Write types for templates to`, displayPath(outputFile));
          await fs.mkdirs(path.dirname(outputFile));
          await fs.writeFile(outputFile, code);
        }
      },
    );
  }

  async getFilesToWatch() {
    try {
      const files = [];
      const subgraph = await this.loadSubgraph({ quiet: true });

      // Add the subgraph manifest file
      files.push(this.options.subgraphManifest);

      // Add the GraphQL schema to the watched files
      files.push(subgraph.getIn(['schema', 'file']));

      // Add all file paths specified in manifest
      subgraph.get('dataSources').map((dataSource: any) => {
        dataSource.getIn(['mapping', 'abis']).map((abi: any) => {
          files.push(abi.get('file'));
        });
      });

      // Make paths absolute
      return files.map(file => path.resolve(file));
    } catch (e) {
      throw Error(`Failed to load subgraph: ${e.message}`);
    }
  }

  async watchAndGenerateTypes() {
    const generator = this;
    let spinner: Spinner;

    // Create watcher and generate types once and then on every change to a watched file
    const watcher = new Watcher({
      onReady: () => (spinner = toolbox.print.spin('Watching subgraph files')),
      onTrigger: async changedFile => {
        if (changedFile !== undefined) {
          spinner.info(`File change detected: ${displayPath(changedFile)}\n`);
        }
        await generator.generateTypes();
        spinner.start();
      },
      onCollectFiles: async () => await generator.getFilesToWatch(),
      onError: error => {
        spinner.stop();
        toolbox.print.error(`${error}\n`);
        spinner.start();
      },
    });

    // Catch keyboard interrupt: close watcher and exit process
    process.on('SIGINT', () => {
      watcher.close();
      process.exit();
    });

    try {
      await watcher.watch();
    } catch (e) {
      toolbox.print.error(String(e.message));
    }
  }
}
