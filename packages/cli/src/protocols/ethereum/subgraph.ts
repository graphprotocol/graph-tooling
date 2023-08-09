import immutable from "immutable";
import * as DataSourcesExtractor from "../../command-helpers/data-sources";
import { Subgraph, SubgraphOptions } from "../subgraph";
import ABI from "./abi";
import { ManifestZodSchema } from "../../manifest";

export default class EthereumSubgraph implements Subgraph {
  public manifest: SubgraphOptions["manifest"];
  public resolveFile: SubgraphOptions["resolveFile"];
  public protocol: SubgraphOptions["protocol"];

  constructor(options: SubgraphOptions) {
    this.manifest = options.manifest;
    this.resolveFile = options.resolveFile;
    this.protocol = options.protocol;
  }

  validateManifest() {
    return this.validateAbis()
      .concat(this.validateEvents())
      .concat(this.validateCallFunctions());
  }

  validateAbis() {
    /**
     * Validate that the the "source > abi" reference of all data sources
     * points to an existing ABI in the data source ABIs
     */
    const abiNames = this.manifest.dataSources.map(({ source }) => source.abi);
    const mappingAbis = new Set(
      this.manifest.dataSources
        .map(({ mapping }) => mapping.abis.map(({ name }) => name))
        .flat()
    );

    const missingAbis = abiNames.filter((abiName) => !mappingAbis.has(abiName));
    const nameErrors = missingAbis.map((abiName) => ({
      path: ["dataSources", "source", "abi"],
      message: `ABI name '${abiName}' not found in mapping > abis.\n Available ABIs: ${Array.from(
        mappingAbis
      )
        .map((name) => `- ${name}`)
        .join("\n")}`,
    }));

    /**
     * Validate that all ABI files are valid
     */
    const fileErrors = this.manifest.dataSources
      .map(({ mapping }) => {
        return mapping.abis
          .map((abi, abiIndex) => {
            try {
              ABI.load(abi.name, this.resolveFile(abi.file));
              return [];
            } catch (e) {
              return [
                {
                  path: [
                    "dataSources",
                    "mapping",
                    "abis",
                    abiIndex.toString(),
                    "file",
                  ],
                  message: e.message,
                },
              ];
            }
          })
          .flat();
      })
      .flat();

    return nameErrors.concat(fileErrors);
  }

  validateEvents() {
    const dataSourcesAndTemplates = DataSourcesExtractor.fromManifest(
      this.manifest,
      this.protocol
    );

    return dataSourcesAndTemplates.reduce(
      (errors: any[], dataSourceOrTemplate: any) => {
        return errors.concat(
          this.validateDataSourceEvents(
            dataSourceOrTemplate.get("dataSource"),
            dataSourceOrTemplate.get("path")
          )
        );
      },
      immutable.List()
    );
  }

  validateDataSourceEvents(dataSource: any, path: string) {
    let abi: ABI;
    try {
      // Resolve the source ABI name into a real ABI object
      const abiName = dataSource.getIn(["source", "abi"]);
      const abiEntry = dataSource
        .getIn(["mapping", "abis"])
        .find((abi: any) => abi.get("name") === abiName);
      abi = ABI.load(
        abiEntry.get("name"),
        this.resolveFile(abiEntry.get("file"))
      );
    } catch (_) {
      // Ignore errors silently; we can't really say anything about
      // the events if the ABI can't even be loaded
      return immutable.List();
    }

    // Obtain event signatures from the mapping
    const manifestEvents = dataSource
      .getIn(["mapping", "eventHandlers"], immutable.List())
      .map((handler: any) => handler.get("event"));

    // Obtain event signatures from the ABI
    const abiEvents = abi.eventSignatures();

    // Add errors for every manifest event signature that is not
    // present in the ABI
    return manifestEvents.reduce(
      (errors: any[], manifestEvent: any, index: number) =>
        abiEvents.includes(manifestEvent)
          ? errors
          : errors.push(
              immutable.fromJS({
                path: [...path, "eventHandlers", index],
                message: `\
Event with signature '${manifestEvent}' not present in ABI '${abi.name}'.
Available events:
${abiEvents
  .sort()
  .map((event) => `- ${event}`)
  .join("\n")}`,
              })
            ),
      immutable.List()
    );
  }

  validateCallFunctions() {
    return this.manifest
      .get("dataSources")
      .filter((dataSource: any) =>
        this.protocol.isValidKindName(dataSource.get("kind"))
      )
      .reduce((errors: any[], dataSource: any, dataSourceIndex: string) => {
        const path = ["dataSources", dataSourceIndex, "callHandlers"];

        let abi: ABI;
        try {
          // Resolve the source ABI name into a real ABI object
          const abiName = dataSource.getIn(["source", "abi"]);
          const abiEntry = dataSource
            .getIn(["mapping", "abis"])
            .find((abi: any) => abi.get("name") === abiName);
          abi = ABI.load(
            abiEntry.get("name"),
            this.resolveFile(abiEntry.get("file"))
          );
        } catch (e) {
          // Ignore errors silently; we can't really say anything about
          // the call functions if the ABI can't even be loaded
          return errors;
        }

        // Obtain event signatures from the mapping
        const manifestFunctions = dataSource
          .getIn(["mapping", "callHandlers"], immutable.List())
          .map((handler: any) => handler.get("function"));

        // Obtain event signatures from the ABI
        const abiFunctions = abi.callFunctionSignatures();

        // Add errors for every manifest event signature that is not
        // present in the ABI
        return manifestFunctions.reduce(
          (errors: any[], manifestFunction: any, index: number) =>
            abiFunctions.includes(manifestFunction)
              ? errors
              : errors.push(
                  immutable.fromJS({
                    path: [...path, index],
                    message: `\
Call function with signature '${manifestFunction}' not present in ABI '${
                      abi.name
                    }'.
Available call functions:
${abiFunctions
  .sort()
  .map((tx) => `- ${tx}`)
  .join("\n")}`,
                  })
                ),
          errors
        );
      }, immutable.List());
  }

  handlerTypes() {
    return immutable.List(["blockHandlers", "callHandlers", "eventHandlers"]);
  }
}
