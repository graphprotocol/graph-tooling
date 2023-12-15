import path from 'path';
import fs from 'fs-extra';
import immutable from 'immutable';
import prettier from 'prettier';
import { GENERATED_FILE_NOTE } from '../../codegen/typescript';
import { displayPath } from '../../command-helpers/fs';
import { Spinner, step, withSpinner } from '../../command-helpers/spinner';
import { TypeGeneratorOptions } from '../../type-generator';
import ABI from './abi';

export default class EthereumTypeGenerator {
  private sourceDir: TypeGeneratorOptions['sourceDir'];
  private outputDir: TypeGeneratorOptions['outputDir'];

  constructor(options: TypeGeneratorOptions) {
    this.sourceDir = options.sourceDir;
    this.outputDir = options.outputDir;
  }

  async loadABIs(subgraph: immutable.Map<any, any>) {
    return await withSpinner(
      'Load contract ABIs',
      'Failed to load contract ABIs',
      `Warnings while loading contract ABIs`,
      async spinner => {
        try {
          return subgraph
            .get('dataSources')
            .reduce(
              (abis: any[], dataSource: any) =>
                dataSource
                  .getIn(['mapping', 'abis'])
                  .reduce(
                    (abis: any[], abi: any) =>
                      abis.push(
                        this._loadABI(dataSource, abi.get('name'), abi.get('file'), spinner),
                      ),
                    abis,
                  ),
              immutable.List(),
            );
        } catch (e) {
          throw Error(`Failed to load contract ABIs: ${e.message}`);
        }
      },
    );
  }

  _loadABI(dataSource: any, name: string, maybeRelativePath: string, spinner: Spinner) {
    try {
      if (this.sourceDir) {
        const absolutePath = path.resolve(this.sourceDir, maybeRelativePath);
        step(spinner, `Load contract ABI from`, displayPath(absolutePath));
        return { dataSource, abi: ABI.load(name, absolutePath) };
      }
      return { dataSource, abi: ABI.load(name, maybeRelativePath) };
    } catch (e) {
      throw Error(`Failed to load contract ABI: ${e.message}`);
    }
  }

  async loadDataSourceTemplateABIs(subgraph: immutable.Map<any, any>) {
    return await withSpinner(
      `Load data source template ABIs`,
      `Failed to load data source template ABIs`,
      `Warnings while loading data source template ABIs`,
      async spinner => {
        const abis = [];
        for (const template of subgraph.get('templates', immutable.List())) {
          for (const abi of template.getIn(['mapping', 'abis'])) {
            abis.push(
              this._loadDataSourceTemplateABI(template, abi.get('name'), abi.get('file'), spinner),
            );
          }
        }
        return abis;
      },
    );
  }

  _loadDataSourceTemplateABI(
    template: any,
    name: string,
    maybeRelativePath: string,
    spinner: Spinner,
  ) {
    try {
      if (this.sourceDir) {
        const absolutePath = path.resolve(this.sourceDir, maybeRelativePath);
        step(spinner, `Load data source template ABI from`, displayPath(absolutePath));
        return { template, abi: ABI.load(name, absolutePath) };
      }
      return { template, abi: ABI.load(name, maybeRelativePath) };
    } catch (e) {
      throw Error(`Failed to load data source template ABI: ${e.message}`);
    }
  }

  async generateTypesForABIs(abis: any[]) {
    return withSpinner(
      `Generate types for contract ABIs`,
      `Failed to generate types for contract ABIs`,
      `Warnings while generating types for contract ABIs`,
      async spinner => {
        return await Promise.all(
          abis.map(async abi => await this._generateTypesForABI(abi, spinner)),
        );
      },
    );
  }

  async _generateTypesForABI(abi: any, spinner: Spinner) {
    try {
      step(
        spinner,
        `Generate types for contract ABI:`,
        `${abi.abi.name} (${displayPath(abi.abi.file)})`,
      );

      const codeGenerator = abi.abi.codeGenerator();
      const code = await prettier.format(
        [
          GENERATED_FILE_NOTE,
          ...codeGenerator.generateModuleImports(),
          ...codeGenerator.generateTypes(),
        ].join('\n'),
        {
          parser: 'typescript',
        },
      );

      const outputFile = path.join(
        this.outputDir,
        abi.dataSource.get('name'),
        `${abi.abi.name}.ts`,
      );
      step(spinner, `Write types to`, displayPath(outputFile));
      await fs.mkdirs(path.dirname(outputFile));
      await fs.writeFile(outputFile, code);
    } catch (e) {
      throw Error(`Failed to generate types for contract ABI: ${e.message}`);
    }
  }

  async generateTypesForDataSourceTemplateABIs(abis: any[]) {
    return await withSpinner(
      `Generate types for data source template ABIs`,
      `Failed to generate types for data source template ABIs`,
      `Warnings while generating types for data source template ABIs`,
      async spinner => {
        return await Promise.all(
          abis.map(async abi => await this._generateTypesForDataSourceTemplateABI(abi, spinner)),
        );
      },
    );
  }

  async _generateTypesForDataSourceTemplateABI(abi: any, spinner: Spinner) {
    try {
      step(
        spinner,
        `Generate types for data source template ABI:`,
        `${abi.template.get('name')} > ${abi.abi.name} (${displayPath(abi.abi.file)})`,
      );

      const codeGenerator = abi.abi.codeGenerator();
      const code = await prettier.format(
        [
          GENERATED_FILE_NOTE,
          ...codeGenerator.generateModuleImports(),
          ...codeGenerator.generateTypes(),
        ].join('\n'),
        {
          parser: 'typescript',
        },
      );

      const outputFile = path.join(
        this.outputDir,
        'templates',
        abi.template.get('name'),
        `${abi.abi.name}.ts`,
      );
      step(spinner, `Write types to`, displayPath(outputFile));
      await fs.mkdirs(path.dirname(outputFile));
      await fs.writeFile(outputFile, code);
    } catch (e) {
      throw Error(`Failed to generate types for data source template ABI: ${e.message}`);
    }
  }
}
