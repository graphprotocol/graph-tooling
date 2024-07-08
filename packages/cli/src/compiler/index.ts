import crypto from 'crypto';
import path from 'path';
import chalk from 'chalk';
import fs from 'fs-extra';
import * as toolbox from 'gluegun';
import immutable from 'immutable';
import type { IPFSHTTPClient } from 'ipfs-http-client';
import yaml from 'js-yaml';
import { Spinner, step, withSpinner } from '../command-helpers/spinner';
import debug from '../debug';
import { applyMigrations } from '../migrations';
import Protocol from '../protocols';
import Subgraph from '../subgraph';
import Watcher from '../watcher';
import * as asc from './asc';

const compilerDebug = debug('graph-cli:compiler');

interface CompilerOptions {
  ipfs: any;
  subgraphManifest: string;
  outputDir: string;
  outputFormat: string;
  skipMigrations: boolean;
  blockIpfsMethods?: RegExpMatchArray;
  protocol: Protocol;
}

export default class Compiler {
  private ipfs: IPFSHTTPClient;
  private sourceDir: string;
  private blockIpfsMethods?: RegExpMatchArray;
  private libsDirs: string[];
  /**
   * Path to the global.ts file in the graph-ts package.
   *
   * @note if you are using substreams as a protocol, this will be undefined.
   */
  private globalsFile?: string;
  private protocol: Protocol;
  private ABI: any;

  constructor(private options: CompilerOptions) {
    this.options = options;
    this.ipfs = options.ipfs;
    this.sourceDir = path.dirname(options.subgraphManifest);
    this.blockIpfsMethods = options.blockIpfsMethods;
    this.libsDirs = [];
    this.protocol = this.options.protocol;
    this.ABI = this.protocol.getABI();

    if (options.protocol.name === 'substreams') {
      return;
    }

    for (
      let dir: string | undefined = path.resolve(this.sourceDir);
      // Terminate after the root dir or when we have found node_modules
      dir !== undefined;
      // Continue with the parent directory, terminate after the root dir
      dir = path.dirname(dir) === dir ? undefined : path.dirname(dir)
    ) {
      if (fs.existsSync(path.join(dir, 'node_modules'))) {
        this.libsDirs.push(path.join(dir, 'node_modules'));
      }
    }

    if (this.libsDirs.length === 0) {
      throw Error(`could not locate \`node_modules\` in parent directories of subgraph manifest`);
    }

    const globalsFile = path.join('@graphprotocol', 'graph-ts', 'global', 'global.ts');
    const globalsLib = this.libsDirs.find(item => {
      return fs.existsSync(path.join(item, globalsFile));
    });

    if (!globalsLib) {
      throw Error(
        'Could not locate `@graphprotocol/graph-ts` package in parent directories of subgraph manifest.',
      );
    }

    this.globalsFile = path.join(globalsLib, globalsFile);

    process.on('uncaughtException', e => {
      toolbox.print.error(`UNCAUGHT EXCEPTION: ${e}`);
    });
  }

  subgraphDir(parent: string, subgraph: immutable.Map<any, any>) {
    return path.join(parent, subgraph.get('name'));
  }

  displayPath(p: string) {
    return path.relative(process.cwd(), p);
  }

  cacheKeyForFile(filename: string) {
    const hash = crypto.createHash('sha1');
    hash.update(fs.readFileSync(filename));
    return hash.digest('hex');
  }

  async compile({
    validate = false,
  }: {
    /**
     * Whether to validate the compiled artifacts.
     */
    validate: boolean;
  }) {
    try {
      if (!this.options.skipMigrations) {
        await applyMigrations({
          sourceDir: this.sourceDir,
          manifestFile: this.options.subgraphManifest,
        });
      }
      const subgraph = await this.loadSubgraph();
      const compiledSubgraph = await this.compileSubgraph(subgraph, validate);
      const localSubgraph = await this.writeSubgraphToOutputDirectory(
        this.options.protocol,
        compiledSubgraph,
      );

      if (this.ipfs !== undefined) {
        const ipfsHash = await this.uploadSubgraphToIPFS(localSubgraph);
        this.completed(ipfsHash);
        return ipfsHash;
      }
      this.completed(path.join(this.options.outputDir, 'subgraph.yaml'));
      return true;
    } catch (e) {
      toolbox.print.error(e);
      return false;
    }
  }

  completed(ipfsHashOrPath: string) {
    toolbox.print.info('');
    toolbox.print.success(`Build completed: ${chalk.blue(ipfsHashOrPath)}`);
    toolbox.print.info('');
  }

  async loadSubgraph({ quiet } = { quiet: false }) {
    const subgraphLoadOptions = { protocol: this.protocol, skipValidation: false };

    if (quiet) {
      return (await Subgraph.load(this.options.subgraphManifest, subgraphLoadOptions)).result;
    }
    const manifestPath = this.displayPath(this.options.subgraphManifest);

    return await withSpinner(
      `Load subgraph from ${manifestPath}`,
      `Failed to load subgraph from ${manifestPath}`,
      `Warnings loading subgraph from ${manifestPath}`,
      async () => {
        return Subgraph.load(this.options.subgraphManifest, subgraphLoadOptions);
      },
    );
  }

  async getFilesToWatch() {
    try {
      const files = [];
      const subgraph = await this.loadSubgraph({ quiet: true });

      // Add the subgraph manifest file
      files.push(this.options.subgraphManifest);

      // Add all file paths specified in manifest
      files.push(path.resolve(subgraph.getIn(['schema', 'file'])));
      subgraph.get('dataSources').map((dataSource: any) => {
        files.push(dataSource.getIn(['mapping', 'file']));
        // Only watch ABI related files if the target protocol has support/need for them.
        if (this.protocol.hasABIs()) {
          dataSource.getIn(['mapping', 'abis']).map((abi: any) => {
            files.push(abi.get('file'));
          });
        }
      });

      // Make paths absolute
      return files.map(file => path.resolve(file));
    } catch (e) {
      throw Error(`Failed to load subgraph: ${e.message}`);
    }
  }

  async watchAndCompile(onCompiled?: (ipfsHash: string) => void) {
    const compiler = this;
    let spinner: Spinner;

    // Create watcher and recompile once and then on every change to a watched file
    const watcher = new Watcher({
      onReady: () => (spinner = toolbox.print.spin('Watching subgraph files')),
      onTrigger: async changedFile => {
        if (changedFile !== undefined) {
          spinner.info(`File change detected: ${this.displayPath(changedFile)}\n`);
        }
        const ipfsHash = await compiler.compile({ validate: false });
        onCompiled?.(ipfsHash);
        spinner.start();
      },
      onCollectFiles: async () => await compiler.getFilesToWatch(),
      onError: error => {
        spinner.stop();
        toolbox.print.error(`${error.message}\n`);
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

  _writeSubgraphFile(
    maybeRelativeFile: string,
    data: string | Buffer,
    sourceDir: string,
    targetDir: string,
    spinner: Spinner,
  ) {
    const absoluteSourceFile = path.resolve(sourceDir, maybeRelativeFile);
    const relativeSourceFile = path.relative(sourceDir, absoluteSourceFile);
    const targetFile = path.join(targetDir, relativeSourceFile);
    step(spinner, 'Write subgraph file', this.displayPath(targetFile));
    fs.mkdirsSync(path.dirname(targetFile));
    fs.writeFileSync(targetFile, data);
    return targetFile;
  }

  async compileSubgraph(subgraph: any, validate = false) {
    return await withSpinner(
      `Compile subgraph`,
      `Failed to compile subgraph`,
      `Warnings while compiling subgraph`,
      async spinner => {
        // Cache compiled files so identical input files are only compiled once
        const compiledFiles = new Map();

        await asc.ready();

        subgraph = subgraph.update('dataSources', (dataSources: any[]) =>
          dataSources.map((dataSource: any) =>
            dataSource.updateIn(['mapping', 'file'], (mappingPath: string) =>
              this._compileDataSourceMapping(
                this.protocol,
                dataSource,
                mappingPath,
                compiledFiles,
                spinner,
                validate,
              ),
            ),
          ),
        );

        subgraph = subgraph.update('templates', (templates: any) =>
          templates === undefined
            ? templates
            : templates.map((template: any) =>
                template.updateIn(['mapping', 'file'], (mappingPath: string) =>
                  this._compileTemplateMapping(template, mappingPath, compiledFiles, spinner),
                ),
              ),
        );

        return subgraph;
      },
    );
  }

  /**
   * Validate that the compiled WASM has all the handlers that are defined in the subgraph manifest
   *
   * @returns a list of handlers that are missing from the compiled WASM
   *
   * This is a temporary solution to validate that the compiled WASM has all the event handlers.
   * A better way would be if we can do this even before compiling
   * but requires a larger refactor so we are running additional validations before compilation
   */
  _validateHandlersInWasm({
    pathToWasm,
    dataSource,
  }: {
    pathToWasm: string;
    dataSource: immutable.Map<any, any>;
  }) {
    const getHandlerNames = (handlerName: string) =>
      (dataSource as any)
        .getIn(['mapping', handlerName])
        // if there is no handler, it will be undefined
        ?.toJS()
        ?.map((e: { handler: string; event: string }) => e.handler) || [];

    // Load the compiled WASM file
    const buffer = fs.readFileSync(pathToWasm);
    const wasmMod = new WebAssembly.Module(buffer);

    // Apologies to TS gods for `any` usage
    // Yet another reason to refactor out immutable.js
    const handlerNamesFromDataSources = [
      // TODO: this is hacky, better is figuring out how to utilize the `protocol.getSubgraph().handlerTypes()`
      ...getHandlerNames('eventHandlers'),
      ...getHandlerNames('callHandlers'),
      ...getHandlerNames('blockHandlers'),
      ...getHandlerNames('transactionHandlers'),
      ...getHandlerNames('messageHandlers'),
      ...getHandlerNames('receiptHandlers'),
    ];

    // We can check the WASM module for the exported functions
    // https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Module/exports
    // Using a Set to avoid duplicates and makes it easier to check if a value is present
    const handlerNamesFromWasm = new Set(
      WebAssembly.Module.exports(wasmMod)
        .filter(e => e.kind === 'function')
        .map(e => e.name),
    );

    // Figure out which handlers are missing
    const missingHandlers = handlerNamesFromDataSources.filter(
      (handler: string) => !handlerNamesFromWasm.has(handler),
    );

    return missingHandlers;
  }

  _compileDataSourceMapping(
    protocol: Protocol,
    dataSource: immutable.Map<any, any>,
    mappingPath: string,
    compiledFiles: Map<any, any>,
    spinner: Spinner,
    validate = false,
  ) {
    if (protocol.name == 'substreams') {
      return;
    }

    try {
      const dataSourceName = dataSource.getIn(['name']);

      const baseDir = this.sourceDir;
      const absoluteMappingPath = path.resolve(baseDir, mappingPath);
      const inputFile = path.relative(baseDir, absoluteMappingPath);
      this._validateMappingContent(absoluteMappingPath);

      // If the file has already been compiled elsewhere, just use that output
      // file and return early
      const inputCacheKey = this.cacheKeyForFile(absoluteMappingPath);
      const alreadyCompiled = compiledFiles.has(inputCacheKey);
      if (alreadyCompiled) {
        const outFile = compiledFiles.get(inputCacheKey);
        step(
          spinner,
          'Compile data source:',
          `${dataSourceName} => ${this.displayPath(outFile)} (already compiled)`,
        );
        return outFile;
      }

      const outFile = path.resolve(
        this.subgraphDir(this.options.outputDir, dataSource),
        this.options.outputFormat == 'wasm' ? `${dataSourceName}.wasm` : `${dataSourceName}.wast`,
      );

      step(spinner, 'Compile data source:', `${dataSourceName} => ${this.displayPath(outFile)}`);

      const outputFile = path.relative(baseDir, outFile);

      // Create output directory
      fs.mkdirsSync(path.dirname(outFile));

      const libs = this.libsDirs.join(',');
      if (!this.globalsFile) {
        throw Error(
          'Could not locate `@graphprotocol/graph-ts` package in parent directories of subgraph manifest.',
        );
      }
      const global = path.relative(baseDir, this.globalsFile);

      asc.compile({
        inputFile,
        global,
        baseDir,
        libs,
        outputFile,
      });

      if (validate) {
        const missingHandlers = this._validateHandlersInWasm({
          pathToWasm: outFile,
          dataSource,
        });
        if (missingHandlers.length > 0) {
          throw Error(`\n\tMissing handlers in WASM: ${missingHandlers.join(', ')}`);
        }
      }

      // Remember the output file to avoid compiling the same file again
      compiledFiles.set(inputCacheKey, outFile);

      return outFile;
    } catch (e) {
      throw Error(`Failed to compile data source mapping: ${e.message}`);
    }
  }

  _compileTemplateMapping(
    template: immutable.Collection<any, any>,
    mappingPath: string,
    compiledFiles: Map<any, any>,
    spinner: Spinner,
  ) {
    try {
      const templateName = template.get('name');

      const baseDir = this.sourceDir;
      const absoluteMappingPath = path.resolve(baseDir, mappingPath);
      const inputFile = path.relative(baseDir, absoluteMappingPath);
      this._validateMappingContent(absoluteMappingPath);

      // If the file has already been compiled elsewhere, just use that output
      // file and return early
      const inputCacheKey = this.cacheKeyForFile(absoluteMappingPath);
      const alreadyCompiled = compiledFiles.has(inputCacheKey);
      if (alreadyCompiled) {
        const outFile = compiledFiles.get(inputCacheKey);
        step(
          spinner,
          'Compile data source template:',
          `${templateName} => ${this.displayPath(outFile)} (already compiled)`,
        );
        return outFile;
      }

      const outFile = path.resolve(
        this.options.outputDir,
        'templates',
        templateName,
        this.options.outputFormat == 'wasm' ? `${templateName}.wasm` : `${templateName}.wast`,
      );

      step(
        spinner,
        'Compile data source template:',
        `${templateName} => ${this.displayPath(outFile)}`,
      );

      const outputFile = path.relative(baseDir, outFile);

      // Create output directory
      fs.mkdirsSync(path.dirname(outFile));

      const libs = this.libsDirs.join(',');
      if (!this.globalsFile) {
        throw Error(
          'Could not locate `@graphprotocol/graph-ts` package in parent directories of subgraph manifest.',
        );
      }
      const global = path.relative(baseDir, this.globalsFile);

      asc.compile({
        inputFile,
        global,
        baseDir,
        libs,
        outputFile,
      });

      // Remember the output file to avoid compiling the same file again
      compiledFiles.set(inputCacheKey, outFile);

      return outFile;
    } catch (e) {
      throw Error(`Failed to compile data source template: ${e.message}`);
    }
  }

  _validateMappingContent(filePath: string) {
    const data = fs.readFileSync(filePath);
    if (this.blockIpfsMethods && (data.includes('ipfs.cat') || data.includes('ipfs.map'))) {
      throw Error(`
      Subgraph Studio does not support mappings with ipfs methods.
      Please remove all instances of ipfs.cat and ipfs.map from
      ${filePath}
      `);
    }
  }

  async writeSubgraphToOutputDirectory(protocol: Protocol, subgraph: immutable.Map<any, any>) {
    const displayDir = `${this.displayPath(this.options.outputDir)}${toolbox.filesystem.separator}`;

    // ensure that the output directory exists
    fs.mkdirsSync(this.options.outputDir);

    return await withSpinner(
      `Write compiled subgraph to ${displayDir}`,
      `Failed to write compiled subgraph to ${displayDir}`,
      `Warnings while writing compiled subgraph to ${displayDir}`,
      async spinner => {
        // Copy schema and update its path
        subgraph = subgraph.updateIn(['schema', 'file'], schemaFile => {
          const schemaFilePath = path.resolve(this.sourceDir, schemaFile as string);
          const schemaFileName = path.basename(schemaFile as string);
          const targetFile = path.resolve(this.options.outputDir, schemaFileName);
          step(spinner, 'Copy schema file', this.displayPath(targetFile));
          fs.copyFileSync(schemaFilePath, targetFile);
          return path.relative(this.options.outputDir, targetFile);
        });

        // Copy data source files and update their paths
        subgraph = subgraph.update('dataSources', (dataSources: any[]) =>
          dataSources.map(dataSource => {
            let updatedDataSource = dataSource;

            if (this.protocol.hasABIs()) {
              updatedDataSource = updatedDataSource
                // Write data source ABIs to the output directory
                .updateIn(['mapping', 'abis'], (abis: any[]) =>
                  abis.map((abi: any) =>
                    abi.update('file', (abiFile: string) => {
                      abiFile = path.resolve(this.sourceDir, abiFile);
                      const abiData = this.ABI.load(abi.get('name'), abiFile);
                      return path.relative(
                        this.options.outputDir,
                        this._writeSubgraphFile(
                          abiFile,
                          JSON.stringify(abiData.data.toJS(), null, 2),
                          this.sourceDir,
                          this.subgraphDir(this.options.outputDir, dataSource),
                          spinner,
                        ),
                      );
                    }),
                  ),
                );
            }

            if (protocol.name == 'substreams' || protocol.name == 'substreams/triggers') {
              updatedDataSource = updatedDataSource
                // Write data source ABIs to the output directory
                .updateIn(['source', 'package'], (substreamsPackage: any) =>
                  substreamsPackage.update('file', (packageFile: string) => {
                    packageFile = path.resolve(this.sourceDir, packageFile);
                    const packageContent = fs.readFileSync(packageFile);

                    return path.relative(
                      this.options.outputDir,
                      this._writeSubgraphFile(
                        packageFile,
                        packageContent,
                        this.sourceDir,
                        this.subgraphDir(this.options.outputDir, dataSource),
                        spinner,
                      ),
                    );
                  }),
                );

              if (updatedDataSource.getIn(['mapping', 'file'])) {
                updatedDataSource = updatedDataSource.updateIn(
                  ['mapping', 'file'],
                  (mappingFile: string) =>
                    path.relative(
                      this.options.outputDir,
                      path.resolve(this.sourceDir, mappingFile),
                    ),
                );
              }

              return updatedDataSource;
            }

            // The mapping file is already being written to the output
            // directory by the AssemblyScript compiler
            return updatedDataSource.updateIn(['mapping', 'file'], (mappingFile: string) =>
              path.relative(this.options.outputDir, path.resolve(this.sourceDir, mappingFile)),
            );
          }),
        );

        // Copy template files and update their paths
        subgraph = subgraph.update('templates', templates =>
          templates === undefined
            ? templates
            : templates.map((template: any) => {
                let updatedTemplate = template;

                if (this.protocol.hasABIs()) {
                  updatedTemplate = updatedTemplate
                    // Write template ABIs to the output directory
                    .updateIn(['mapping', 'abis'], (abis: any[]) =>
                      abis.map(abi =>
                        abi.update('file', (abiFile: string) => {
                          abiFile = path.resolve(this.sourceDir, abiFile);
                          const abiData = this.ABI.load(abi.get('name'), abiFile);
                          return path.relative(
                            this.options.outputDir,
                            this._writeSubgraphFile(
                              abiFile,
                              JSON.stringify(abiData.data.toJS(), null, 2),
                              this.sourceDir,
                              this.subgraphDir(this.options.outputDir, template),
                              spinner,
                            ),
                          );
                        }),
                      ),
                    );
                }

                // The mapping file is already being written to the output
                // directory by the AssemblyScript compiler
                return updatedTemplate.updateIn(['mapping', 'file'], (mappingFile: string) =>
                  path.relative(this.options.outputDir, path.resolve(this.sourceDir, mappingFile)),
                );
              }),
        );

        // Write the subgraph manifest itself
        const outputFilename = path.join(this.options.outputDir, 'subgraph.yaml');
        step(spinner, 'Write subgraph manifest', this.displayPath(outputFilename));
        await Subgraph.write(subgraph, outputFilename);

        return subgraph;
      },
    );
  }

  async uploadSubgraphToIPFS(subgraph: immutable.Map<any, any>) {
    return withSpinner(
      `Upload subgraph to IPFS`,
      `Failed to upload subgraph to IPFS`,
      `Warnings while uploading subgraph to IPFS`,
      async spinner => {
        // Cache uploaded IPFS files so identical files are only uploaded once
        const uploadedFiles = new Map();

        // Collect all source (path -> hash) updates to apply them later
        const updates = [];

        // Upload the schema to IPFS
        updates.push({
          keyPath: ['schema', 'file'],
          value: await this._uploadFileToIPFS(
            subgraph.getIn(['schema', 'file']) as string,
            uploadedFiles,
            spinner,
          ),
        });

        if (this.protocol.hasABIs()) {
          for (const [i, dataSource] of subgraph.get('dataSources').entries()) {
            for (const [j, abi] of dataSource.getIn(['mapping', 'abis']).entries()) {
              updates.push({
                keyPath: ['dataSources', i, 'mapping', 'abis', j, 'file'],
                value: await this._uploadFileToIPFS(abi.get('file'), uploadedFiles, spinner),
              });
            }
          }
        }

        // Upload all mappings
        if (this.protocol.name === 'substreams' || this.protocol.name === 'substreams/triggers') {
          for (const [i, dataSource] of subgraph.get('dataSources').entries()) {
            updates.push({
              keyPath: ['dataSources', i, 'source', 'package', 'file'],
              value: await this._uploadFileToIPFS(
                dataSource.getIn(['source', 'package', 'file']),
                uploadedFiles,
                spinner,
              ),
            });

            if (dataSource.getIn(['mapping', 'file'])) {
              updates.push({
                keyPath: ['dataSources', i, 'mapping', 'file'],
                value: await this._uploadFileToIPFS(
                  dataSource.getIn(['mapping', 'file']),
                  uploadedFiles,
                  spinner,
                ),
              });
            }
          }
        } else {
          for (const [i, dataSource] of subgraph.get('dataSources').entries()) {
            updates.push({
              keyPath: ['dataSources', i, 'mapping', 'file'],
              value: await this._uploadFileToIPFS(
                dataSource.getIn(['mapping', 'file']),
                uploadedFiles,
                spinner,
              ),
            });
          }
        }

        for (const [i, template] of subgraph.get('templates', immutable.List()).entries()) {
          if (this.protocol.hasABIs()) {
            for (const [j, abi] of template.getIn(['mapping', 'abis']).entries()) {
              updates.push({
                keyPath: ['templates', i, 'mapping', 'abis', j, 'file'],
                value: await this._uploadFileToIPFS(abi.get('file'), uploadedFiles, spinner),
              });
            }
          }

          updates.push({
            keyPath: ['templates', i, 'mapping', 'file'],
            value: await this._uploadFileToIPFS(
              template.getIn(['mapping', 'file']),
              uploadedFiles,
              spinner,
            ),
          });
        }

        // Apply all updates to the subgraph
        for (const update of updates) {
          subgraph = subgraph.setIn(update.keyPath, update.value);
        }

        // Upload the subgraph itself
        return await this._uploadSubgraphDefinitionToIPFS(subgraph);
      },
    );
  }

  async _uploadFileToIPFS(
    maybeRelativeFile: string,
    uploadedFiles: Map<any, any>,
    spinner: Spinner,
  ) {
    compilerDebug(
      'Resolving IPFS file "%s" from output dir "%s"',
      maybeRelativeFile,
      this.options.outputDir,
    );
    const absoluteFile = path.resolve(this.options.outputDir, maybeRelativeFile);
    step(spinner, 'Add file to IPFS', this.displayPath(absoluteFile));

    const uploadCacheKey = this.cacheKeyForFile(absoluteFile);
    const alreadyUploaded = uploadedFiles.has(uploadCacheKey);

    if (!alreadyUploaded) {
      // @ts-expect-error Buffer.from with Buffer data can indeed accept utf-8
      const content = Buffer.from(await fs.readFile(absoluteFile), 'utf-8');
      const hash = await this._uploadToIPFS({
        path: path.relative(this.options.outputDir, absoluteFile),
        content,
      });

      uploadedFiles.set(uploadCacheKey, hash);
    }

    const hash = uploadedFiles.get(uploadCacheKey);
    step(spinner, '              ..', `${hash}${alreadyUploaded ? ' (already uploaded)' : ''}`);
    return immutable.fromJS({ '/': `/ipfs/${hash}` });
  }

  async _uploadSubgraphDefinitionToIPFS(subgraph: immutable.Map<any, any>) {
    const str = yaml.safeDump(subgraph.toJS(), { noRefs: true, sortKeys: true });
    const file = { path: 'subgraph.yaml', content: Buffer.from(str, 'utf-8') };
    return await this._uploadToIPFS(file);
  }

  async _uploadToIPFS(file: { path: string; content: Buffer }) {
    try {
      const files = this.ipfs.addAll([file]);

      // We get back async iterable
      const filesIterator = files[Symbol.asyncIterator]();
      // We only care about the first item, since that is the file, rest could be directories
      const { value } = await filesIterator.next();

      // we grab the file and pin it
      const uploadedFile = value as Awaited<ReturnType<typeof this.ipfs.add>>;
      await this.ipfs.pin.add(uploadedFile.cid);

      return uploadedFile.cid.toString();
    } catch (e) {
      throw Error(`Failed to upload file to IPFS: ${e.message}`);
    }
  }
}
