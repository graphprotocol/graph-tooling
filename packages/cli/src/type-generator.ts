import path from 'path';
import fs from 'fs-extra';
import * as toolbox from 'gluegun';
import * as graphql from 'graphql/language';
import immutable from 'immutable';
import prettier from 'prettier';
// @ts-expect-error TODO: type out if necessary
import uncrashable from '@float-capital/float-subgraph-uncrashable/src/Index.bs.js';
import DataSourceTemplateCodeGenerator from './codegen/template';
import { GENERATED_FILE_NOTE } from './codegen/typescript';
import { displayPath } from './command-helpers/fs';
import { Spinner, step, withSpinner } from './command-helpers/spinner';
import { applyMigrations } from './migrations';
import Protocol from './protocols';
import Schema from './schema';
import Subgraph from './subgraph';
import Watcher from './watcher';

export interface TypeGeneratorOptions {
  sourceDir?: string;
  subgraphManifest: string;
  subgraph?: string;
  protocol: Protocol;
  outputDir: string;
  skipMigrations?: boolean;
  uncrashable: any;
  uncrashableConfig: boolean;
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
        const abis = await this.protocolTypeGenerator.loadABIs(subgraph);
        await this.protocolTypeGenerator.generateTypesForABIs(abis);
      }

      await this.generateTypesForDataSourceTemplates(subgraph);

      // Not all protocols support/have ABIs.
      if (this.protocol.hasABIs()) {
        const templateAbis = await this.protocolTypeGenerator.loadDataSourceTemplateABIs(subgraph);
        await this.protocolTypeGenerator.generateTypesForDataSourceTemplateABIs(templateAbis);
      }

      const schema = await this.loadSchema(subgraph);
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
    const subgraphLoadOptions = { protocol: this.protocol, skipValidation: false };

    if (quiet) {
      return this.options.subgraph
        ? this.options.subgraph
        : (await Subgraph.load(this.options.subgraphManifest, subgraphLoadOptions)).result;
    }
    const manifestPath = displayPath(this.options.subgraphManifest);

    return await withSpinner(
      `Load subgraph from ${manifestPath}`,
      `Failed to load subgraph from ${manifestPath}`,
      `Warnings while loading subgraph from ${manifestPath}`,
      async _spinner => {
        return this.options.subgraph
          ? this.options.subgraph
          : Subgraph.load(this.options.subgraphManifest, subgraphLoadOptions);
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
        const code = prettier.format(
          [
            GENERATED_FILE_NOTE,
            ...codeGenerator.generateModuleImports(),
            ...codeGenerator.generateTypes(),
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

            // Only generate module imports once, because they are identical for
            // all types generated for data source templates.
            if (codeSegments.isEmpty()) {
              codeSegments = codeSegments.concat(codeGenerator.generateModuleImports());
            }

            return codeSegments.concat(codeGenerator.generateTypes());
          }, immutable.List());

        if (!codeSegments.isEmpty()) {
          const code = prettier.format([GENERATED_FILE_NOTE, ...codeSegments].join('\n'), {
            parser: 'typescript',
          });

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
