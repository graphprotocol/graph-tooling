import path from "path";
import fs from "fs-extra";
import immutable from "immutable";
import prettier from "prettier";
import { GENERATED_FILE_NOTE } from "../../codegen/typescript";
import { displayPath } from "../../command-helpers/fs";
import withSpinner, { Spinner, step } from "../../command-helpers/spinner";
import { DataSource } from "../utils";
import ABI from "./abi";

export default class EthereumTypeGenerator {
  private datasource: DataSource;

  constructor(datasource: DataSource) {
    this.datasource = datasource;
  }

  async loadABIs({ sourceDir }: { sourceDir: string }) {
    return await withSpinner(
      "Load contract ABIs",
      "Failed to load contract ABIs",
      `Warnings while loading contract ABIs`,
      async (spinner) => {
        switch (this.datasource.kind) {
          case "ethereum":
          case "ethereum/contract": {
            const abis = this.datasource.mapping.abis;
            try {
              const a = await Promise.all(
                abis.map((abi) =>
                  this._loadABI({
                    name: abi.name,
                    file: abi.file,
                    spinner,
                    sourceDir,
                  })
                )
              );

              return a;
            } catch (e) {
              throw Error(`Failed to load contract ABIs: ${e.message}`);
            }
          }
          default:
            throw Error(
              `Cannot use 'EthereumTypeGenerator' with data source kind '${this.datasource.kind}'`
            );
        }
      }
    );
  }

  _loadABI({
    name,
    file,
    spinner,
    sourceDir,
  }: {
    name: string;
    file: string;
    spinner: Spinner;
    sourceDir: string | undefined;
  }) {
    try {
      if (sourceDir) {
        const absolutePath = path.resolve(sourceDir, file);
        step(spinner, `Load contract ABI from`, displayPath(absolutePath));
        return ABI.load(name, absolutePath);
      }
      return ABI.load(name, file);
    } catch (e) {
      throw Error(`Failed to load contract ABI: ${e.message}`);
    }
  }

  async loadDataSourceTemplateABIs(subgraph: immutable.Map<any, any>) {
    return await withSpinner(
      `Load data source template ABIs`,
      `Failed to load data source template ABIs`,
      `Warnings while loading data source template ABIs`,
      async (spinner) => {
        const abis = [];
        for (const template of subgraph.get("templates", immutable.List())) {
          for (const abi of template.getIn(["mapping", "abis"])) {
            abis.push(
              this._loadDataSourceTemplateABI(
                template,
                abi.get("name"),
                abi.get("file"),
                spinner
              )
            );
          }
        }
        return abis;
      }
    );
  }

  _loadDataSourceTemplateABI(
    template: any,
    name: string,
    maybeRelativePath: string,
    spinner: Spinner
  ) {
    try {
      if (this.sourceDir) {
        const absolutePath = path.resolve(this.sourceDir, maybeRelativePath);
        step(
          spinner,
          `Load data source template ABI from`,
          displayPath(absolutePath)
        );
        return { template, abi: ABI.load(name, absolutePath) };
      }
      return { template, abi: ABI.load(name, maybeRelativePath) };
    } catch (e) {
      throw Error(`Failed to load data source template ABI: ${e.message}`);
    }
  }

  generateTypesForABIs(abis: any[]) {
    return withSpinner(
      `Generate types for contract ABIs`,
      `Failed to generate types for contract ABIs`,
      `Warnings while generating types for contract ABIs`,
      async (spinner) => {
        return await Promise.all(
          abis.map(async (abi) => await this._generateTypesForABI(abi, spinner))
        );
      }
    );
  }

  async _generateTypesForABI(abi: any, spinner: Spinner) {
    try {
      step(
        spinner,
        `Generate types for contract ABI:`,
        `${abi.abi.name} (${displayPath(abi.abi.file)})`
      );

      const codeGenerator = abi.abi.codeGenerator();
      const code = prettier.format(
        [
          GENERATED_FILE_NOTE,
          ...codeGenerator.generateModuleImports(),
          ...codeGenerator.generateTypes(),
        ].join("\n"),
        {
          parser: "typescript",
        }
      );

      const outputFile = path.join(
        this.outputDir,
        abi.dataSource.get("name"),
        `${abi.abi.name}.ts`
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
      async (spinner) => {
        return await Promise.all(
          abis.map(
            async (abi) =>
              await this._generateTypesForDataSourceTemplateABI(abi, spinner)
          )
        );
      }
    );
  }

  async _generateTypesForDataSourceTemplateABI(abi: any, spinner: Spinner) {
    try {
      step(
        spinner,
        `Generate types for data source template ABI:`,
        `${abi.template.get("name")} > ${abi.abi.name} (${displayPath(
          abi.abi.file
        )})`
      );

      const codeGenerator = abi.abi.codeGenerator();
      const code = prettier.format(
        [
          GENERATED_FILE_NOTE,
          ...codeGenerator.generateModuleImports(),
          ...codeGenerator.generateTypes(),
        ].join("\n"),
        {
          parser: "typescript",
        }
      );

      const outputFile = path.join(
        this.outputDir,
        "templates",
        abi.template.get("name"),
        `${abi.abi.name}.ts`
      );
      step(spinner, `Write types to`, displayPath(outputFile));
      await fs.mkdirs(path.dirname(outputFile));
      await fs.writeFile(outputFile, code);
    } catch (e) {
      throw Error(
        `Failed to generate types for data source template ABI: ${e.message}`
      );
    }
  }
}
