const chalk = require('chalk')
const crypto = require('crypto')
const fs = require('fs-extra')
const immutable = require('immutable')
const path = require('path')
const yaml = require('js-yaml')
const toolbox = require('gluegun/toolbox')

const { step, withSpinner } = require('../command-helpers/spinner')
const Subgraph = require('../subgraph')
const Watcher = require('../watcher')
const { applyMigrations } = require('../migrations')
const asc = require('./asc')
const SubstreamsSubgraph = require('../protocols/substreams/subgraph')

let compilerDebug = require('../debug')('graph-cli:compiler')

class Compiler {
  constructor(options) {
    this.options = options
    this.ipfs = options.ipfs
    this.sourceDir = path.dirname(options.subgraphManifest)
    this.blockIpfsMethods = options.blockIpfsMethods
    this.libsDirs = []

    if (options.protocol.name !== 'substreams') {
      for (
        let dir = path.resolve(this.sourceDir);
        // Terminate after the root dir or when we have found node_modules
        dir !== undefined;
        // Continue with the parent directory, terminate after the root dir
        dir = path.dirname(dir) === dir ? undefined : path.dirname(dir)
      ) {
        if (fs.existsSync(path.join(dir, 'node_modules'))) {
          this.libsDirs.push(path.join(dir, 'node_modules'))
        }
      }

      if (this.libsDirs.length === 0) {
        throw Error(
          `could not locate \`node_modules\` in parent directories of subgraph manifest`,
        )
      }

      const globalsFile = path.join('@graphprotocol', 'graph-ts', 'global', 'global.ts')
      const globalsLib = this.libsDirs.find(item => {
        return fs.existsSync(path.join(item, globalsFile))
      })

      if (!globalsLib) {
        throw Error(
          'Could not locate `@graphprotocol/graph-ts` package in parent directories of subgraph manifest.',
        )
      }

      this.globalsFile = path.join(globalsLib, globalsFile)
    }

    this.protocol = this.options.protocol
    this.ABI = this.protocol.getABI()

    process.on('uncaughtException', function(e) {
      toolbox.print.error(`UNCAUGHT EXCEPTION: ${e}`)
    })
  }

  subgraphDir(parent, subgraph) {
    return path.join(parent, subgraph.get('name'))
  }

  displayPath(p) {
    return path.relative(process.cwd(), p)
  }

  cacheKeyForFile(filename) {
    let hash = crypto.createHash('sha1')
    hash.update(fs.readFileSync(filename))
    return hash.digest('hex')
  }

  async compile() {
    try {
      if (!this.options.skipMigrations) {
        await applyMigrations({
          sourceDir: this.sourceDir,
          manifestFile: this.options.subgraphManifest,
        })
      }
      let subgraph = await this.loadSubgraph()
      let compiledSubgraph = await this.compileSubgraph(subgraph)
      let localSubgraph = await this.writeSubgraphToOutputDirectory(
        this.options.protocol,
        compiledSubgraph,
      )

      if (this.ipfs !== undefined) {
        let ipfsHash = await this.uploadSubgraphToIPFS(localSubgraph)
        this.completed(ipfsHash)
        return ipfsHash
      } else {
        this.completed(path.join(this.options.outputDir, 'subgraph.yaml'))
        return true
      }
    } catch (e) {
      toolbox.print.error(e)
      return false
    }
  }

  completed(ipfsHashOrPath) {
    toolbox.print.info('')
    toolbox.print.success(`Build completed: ${chalk.blue(ipfsHashOrPath)}`)
    toolbox.print.info('')
  }

  async loadSubgraph({ quiet } = { quiet: false }) {
    const subgraphLoadOptions = { protocol: this.protocol, skipValidation: false }

    if (quiet) {
      return Subgraph.load(this.options.subgraphManifest, subgraphLoadOptions).result
    } else {
      const manifestPath = this.displayPath(this.options.subgraphManifest)

      return await withSpinner(
        `Load subgraph from ${manifestPath}`,
        `Failed to load subgraph from ${manifestPath}`,
        `Warnings loading subgraph from ${manifestPath}`,
        async spinner => {
          return Subgraph.load(this.options.subgraphManifest, subgraphLoadOptions)
        },
      )
    }
  }

  async getFilesToWatch() {
    try {
      let files = []
      let subgraph = await this.loadSubgraph({ quiet: true })

      // Add the subgraph manifest file
      files.push(this.options.subgraphManifest)

      // Add all file paths specified in manifest
      files.push(path.resolve(subgraph.getIn(['schema', 'file'])))
      subgraph.get('dataSources').map(dataSource => {
        files.push(dataSource.getIn(['mapping', 'file']))
        // Only watch ABI related files if the target protocol has support/need for them.
        if (this.protocol.hasABIs()) {
          dataSource.getIn(['mapping', 'abis']).map(abi => {
            files.push(abi.get('file'))
          })
        }
      })

      // Make paths absolute
      return files.map(file => path.resolve(file))
    } catch (e) {
      throw Error(`Failed to load subgraph: ${e.message}`)
    }
  }

  async watchAndCompile(onCompiled = undefined) {
    let compiler = this
    let spinner

    // Create watcher and recompile once and then on every change to a watched file
    let watcher = new Watcher({
      onReady: () => (spinner = toolbox.print.spin('Watching subgraph files')),
      onTrigger: async changedFile => {
        if (changedFile !== undefined) {
          spinner.info(`File change detected: ${this.displayPath(changedFile)}\n`)
        }
        let ipfsHash = await compiler.compile()
        if (onCompiled !== undefined) {
          onCompiled(ipfsHash)
        }
        spinner.start()
      },
      onCollectFiles: async () => await compiler.getFilesToWatch(),
      onError: error => {
        spinner.stop()
        toolbox.print.error(`${error.message}\n`)
        spinner.start()
      },
    })

    // Catch keyboard interrupt: close watcher and exit process
    process.on('SIGINT', () => {
      watcher.close()
      process.exit()
    })

    try {
      await watcher.watch()
    } catch (e) {
      toolbox.print.error(`${e.message}`)
    }
  }

  _writeSubgraphFile(maybeRelativeFile, data, sourceDir, targetDir, spinner) {
    let absoluteSourceFile = path.resolve(sourceDir, maybeRelativeFile)
    let relativeSourceFile = path.relative(sourceDir, absoluteSourceFile)
    let targetFile = path.join(targetDir, relativeSourceFile)
    step(spinner, 'Write subgraph file', this.displayPath(targetFile))
    fs.mkdirsSync(path.dirname(targetFile))
    fs.writeFileSync(targetFile, data)
    return targetFile
  }

  async compileSubgraph(subgraph) {
    return await withSpinner(
      `Compile subgraph`,
      `Failed to compile subgraph`,
      `Warnings while compiling subgraph`,
      async spinner => {
        // Cache compiled files so identical input files are only compiled once
        let compiledFiles = new Map()

        await asc.ready()

        subgraph = subgraph.update('dataSources', dataSources =>
          dataSources.map(dataSource =>
            dataSource.updateIn(['mapping', 'file'], mappingPath =>
              this._compileDataSourceMapping(
                this.protocol,
                dataSource,
                mappingPath,
                compiledFiles,
                spinner,
              ),
            ),
          ),
        )

        subgraph = subgraph.update('templates', templates =>
          templates === undefined
            ? templates
            : templates.map(template =>
                template.updateIn(['mapping', 'file'], mappingPath =>
                  this._compileTemplateMapping(
                    template,
                    mappingPath,
                    compiledFiles,
                    spinner,
                  ),
                ),
              ),
        )

        return subgraph
      },
    )
  }

  _compileDataSourceMapping(protocol, dataSource, mappingPath, compiledFiles, spinner) {
    if (protocol.name == 'substreams') {
      return
    }

    try {
      let dataSourceName = dataSource.getIn(['name'])

      let baseDir = this.sourceDir
      let absoluteMappingPath = path.resolve(baseDir, mappingPath)
      let inputFile = path.relative(baseDir, absoluteMappingPath)
      this._validateMappingContent(absoluteMappingPath)

      // If the file has already been compiled elsewhere, just use that output
      // file and return early
      let inputCacheKey = this.cacheKeyForFile(absoluteMappingPath)
      let alreadyCompiled = compiledFiles.has(inputCacheKey)
      if (alreadyCompiled) {
        let outFile = compiledFiles.get(inputCacheKey)
        step(
          spinner,
          'Compile data source:',
          `${dataSourceName} => ${this.displayPath(outFile)} (already compiled)`,
        )
        return outFile
      }

      let outFile = path.resolve(
        this.subgraphDir(this.options.outputDir, dataSource),
        this.options.outputFormat == 'wasm'
          ? `${dataSourceName}.wasm`
          : `${dataSourceName}.wast`,
      )

      step(
        spinner,
        'Compile data source:',
        `${dataSourceName} => ${this.displayPath(outFile)}`,
      )

      let outputFile = path.relative(baseDir, outFile)

      // Create output directory
      try {
        fs.mkdirsSync(path.dirname(outFile))
      } catch (e) {
        throw e
      }

      let libs = this.libsDirs.join(',')
      let global = path.relative(baseDir, this.globalsFile)

      asc.compile({
        inputFile,
        global,
        baseDir,
        libs,
        outputFile,
      })

      // Remember the output file to avoid compiling the same file again
      compiledFiles.set(inputCacheKey, outFile)

      return outFile
    } catch (e) {
      throw Error(`Failed to compile data source mapping: ${e.message}`)
    }
  }

  _compileTemplateMapping(template, mappingPath, compiledFiles, spinner) {
    try {
      let templateName = template.get('name')

      let baseDir = this.sourceDir
      let absoluteMappingPath = path.resolve(baseDir, mappingPath)
      let inputFile = path.relative(baseDir, absoluteMappingPath)
      this._validateMappingContent(absoluteMappingPath)

      // If the file has already been compiled elsewhere, just use that output
      // file and return early
      let inputCacheKey = this.cacheKeyForFile(absoluteMappingPath)
      let alreadyCompiled = compiledFiles.has(inputCacheKey)
      if (alreadyCompiled) {
        let outFile = compiledFiles.get(inputCacheKey)
        step(
          spinner,
          'Compile data source template:',
          `${templateName} => ${this.displayPath(outFile)} (already compiled)`,
        )
        return outFile
      }

      let outFile = path.resolve(
        this.options.outputDir,
        'templates',
        templateName,
        this.options.outputFormat == 'wasm'
          ? `${templateName}.wasm`
          : `${templateName}.wast`,
      )

      step(
        spinner,
        'Compile data source template:',
        `${templateName} => ${this.displayPath(outFile)}`,
      )

      let outputFile = path.relative(baseDir, outFile)

      // Create output directory
      try {
        fs.mkdirsSync(path.dirname(outFile))
      } catch (e) {
        throw e
      }

      let libs = this.libsDirs.join(',')
      let global = path.relative(baseDir, this.globalsFile)

      asc.compile({
        inputFile,
        global,
        baseDir,
        libs,
        outputFile,
      })

      // Remember the output file to avoid compiling the same file again
      compiledFiles.set(inputCacheKey, outFile)

      return outFile
    } catch (e) {
      throw Error(`Failed to compile data source template: ${e.message}`)
    }
  }

  _validateMappingContent(filePath) {
    const data = fs.readFileSync(filePath)
    if (
      this.blockIpfsMethods &&
      (data.includes('ipfs.cat') || data.includes('ipfs.map'))
    ) {
      throw Error(`
      Subgraph Studio does not support mappings with ipfs methods.
      Please remove all instances of ipfs.cat and ipfs.map from
      ${filePath}
      `)
    }
  }

  async writeSubgraphToOutputDirectory(protocol, subgraph) {
    const displayDir = `${this.displayPath(this.options.outputDir)}${
      toolbox.filesystem.separator
    }`

    return await withSpinner(
      `Write compiled subgraph to ${displayDir}`,
      `Failed to write compiled subgraph to ${displayDir}`,
      `Warnings while writing compiled subgraph to ${displayDir}`,
      async spinner => {
        // Copy schema and update its path
        subgraph = subgraph.updateIn(['schema', 'file'], schemaFile => {
          const schemaFilePath = path.resolve(this.sourceDir, schemaFile)
          const schemaFileName = path.basename(schemaFile)
          const targetFile = path.resolve(this.options.outputDir, schemaFileName)
          step(spinner, 'Copy schema file', this.displayPath(targetFile))
          fs.copyFileSync(schemaFilePath, targetFile)
          return path.relative(this.options.outputDir, targetFile)
        })

        // Copy data source files and update their paths
        subgraph = subgraph.update('dataSources', dataSources =>
          dataSources.map(dataSource => {
            let updatedDataSource = dataSource

            if (this.protocol.hasABIs()) {
              updatedDataSource = updatedDataSource
                // Write data source ABIs to the output directory
                .updateIn(['mapping', 'abis'], abis =>
                  abis.map(abi =>
                    abi.update('file', abiFile => {
                      abiFile = path.resolve(this.sourceDir, abiFile)
                      let abiData = this.ABI.load(abi.get('name'), abiFile)
                      return path.relative(
                        this.options.outputDir,
                        this._writeSubgraphFile(
                          abiFile,
                          JSON.stringify(abiData.data.toJS(), null, 2),
                          this.sourceDir,
                          this.subgraphDir(this.options.outputDir, dataSource),
                          spinner,
                        ),
                      )
                    }),
                  ),
                )
            }

            if (protocol.name == 'substreams') {
              updatedDataSource = updatedDataSource
                // Write data source ABIs to the output directory
                .updateIn(['source', 'package'], substreamsPackage =>
                  substreamsPackage.update('file', packageFile => {
                    packageFile = path.resolve(this.sourceDir, packageFile)
                    let packageContent = fs.readFileSync(packageFile)

                    return path.relative(
                      this.options.outputDir,
                      this._writeSubgraphFile(
                        packageFile,
                        packageContent,
                        this.sourceDir,
                        this.subgraphDir(this.options.outputDir, dataSource),
                        spinner,
                      ),
                    )
                  }),
                )

              return updatedDataSource
            }

            // The mapping file is already being written to the output
            // directory by the AssemblyScript compiler
            return updatedDataSource.updateIn(['mapping', 'file'], mappingFile =>
              path.relative(
                this.options.outputDir,
                path.resolve(this.sourceDir, mappingFile),
              ),
            )
          }),
        )

        // Copy template files and update their paths
        subgraph = subgraph.update('templates', templates =>
          templates === undefined
            ? templates
            : templates.map(template => {
                let updatedTemplate = template

                if (this.protocol.hasABIs()) {
                  updatedTemplate = updatedTemplate
                    // Write template ABIs to the output directory
                    .updateIn(['mapping', 'abis'], abis =>
                      abis.map(abi =>
                        abi.update('file', abiFile => {
                          abiFile = path.resolve(this.sourceDir, abiFile)
                          let abiData = this.ABI.load(abi.get('name'), abiFile)
                          return path.relative(
                            this.options.outputDir,
                            this._writeSubgraphFile(
                              abiFile,
                              JSON.stringify(abiData.data.toJS(), null, 2),
                              this.sourceDir,
                              this.subgraphDir(this.options.outputDir, template),
                              spinner,
                            ),
                          )
                        }),
                      ),
                    )
                }

                // The mapping file is already being written to the output
                // directory by the AssemblyScript compiler
                return updatedTemplate.updateIn(['mapping', 'file'], mappingFile =>
                  path.relative(
                    this.options.outputDir,
                    path.resolve(this.sourceDir, mappingFile),
                  ),
                )
              }),
        )

        // Write the subgraph manifest itself
        let outputFilename = path.join(this.options.outputDir, 'subgraph.yaml')
        step(spinner, 'Write subgraph manifest', this.displayPath(outputFilename))
        await Subgraph.write(subgraph, outputFilename)

        return subgraph
      },
    )
  }

  async uploadSubgraphToIPFS(subgraph) {
    return withSpinner(
      `Upload subgraph to IPFS`,
      `Failed to upload subgraph to IPFS`,
      `Warnings while uploading subgraph to IPFS`,
      async spinner => {
        // Cache uploaded IPFS files so identical files are only uploaded once
        let uploadedFiles = new Map()

        // Collect all source (path -> hash) updates to apply them later
        let updates = []

        // Upload the schema to IPFS
        updates.push({
          keyPath: ['schema', 'file'],
          value: await this._uploadFileToIPFS(
            subgraph.getIn(['schema', 'file']),
            uploadedFiles,
            spinner,
          ),
        })

        if (this.protocol.hasABIs()) {
          for (let [i, dataSource] of subgraph.get('dataSources').entries()) {
            for (let [j, abi] of dataSource.getIn(['mapping', 'abis']).entries()) {
              updates.push({
                keyPath: ['dataSources', i, 'mapping', 'abis', j, 'file'],
                value: await this._uploadFileToIPFS(
                  abi.get('file'),
                  uploadedFiles,
                  spinner,
                ),
              })
            }
          }
        }

        // Upload all mappings
        if (this.protocol.name !== 'substreams') {
          for (let [i, dataSource] of subgraph.get('dataSources').entries()) {
            updates.push({
              keyPath: ['dataSources', i, 'mapping', 'file'],
              value: await this._uploadFileToIPFS(
                dataSource.getIn(['mapping', 'file']),
                uploadedFiles,
                spinner,
              ),
            })
          }
        } else {
          for (let [i, dataSource] of subgraph.get('dataSources').entries()) {
            updates.push({
              keyPath: ['dataSources', i, 'source', 'package', 'file'],
              value: await this._uploadFileToIPFS(
                dataSource.getIn(['source', 'package', 'file']),
                uploadedFiles,
                spinner,
              ),
            })
          }
        }

        for (let [i, template] of subgraph.get('templates', immutable.List()).entries()) {
          if (this.protocol.hasABIs()) {
            for (let [j, abi] of template.getIn(['mapping', 'abis']).entries()) {
              updates.push({
                keyPath: ['templates', i, 'mapping', 'abis', j, 'file'],
                value: await this._uploadFileToIPFS(
                  abi.get('file'),
                  uploadedFiles,
                  spinner,
                ),
              })
            }
          }

          updates.push({
            keyPath: ['templates', i, 'mapping', 'file'],
            value: await this._uploadFileToIPFS(
              template.getIn(['mapping', 'file']),
              uploadedFiles,
              spinner,
            ),
          })
        }

        // Apply all updates to the subgraph
        for (let update of updates) {
          subgraph = subgraph.setIn(update.keyPath, update.value)
        }

        // Upload the subgraph itself
        return await this._uploadSubgraphDefinitionToIPFS(subgraph, spinner)
      },
    )
  }

  async _uploadFileToIPFS(maybeRelativeFile, uploadedFiles, spinner) {
    compilerDebug(
      'Resolving IPFS file "%s" from output dir "%s"',
      maybeRelativeFile,
      this.options.outputDir,
    )
    let absoluteFile = path.resolve(this.options.outputDir, maybeRelativeFile)
    step(spinner, 'Add file to IPFS', this.displayPath(absoluteFile))

    let uploadCacheKey = this.cacheKeyForFile(absoluteFile)
    let alreadyUploaded = uploadedFiles.has(uploadCacheKey)

    if (!alreadyUploaded) {
      let content = Buffer.from(await fs.readFile(absoluteFile), 'utf-8')
      let hash = await this._uploadToIPFS({
        path: path.relative(this.options.outputDir, absoluteFile),
        content: content,
      })

      uploadedFiles.set(uploadCacheKey, hash)
    }

    let hash = uploadedFiles.get(uploadCacheKey)
    step(
      spinner,
      '              ..',
      `${hash}${alreadyUploaded ? ' (already uploaded)' : ''}`,
    )
    return immutable.fromJS({ '/': `/ipfs/${hash}` })
  }

  async _uploadSubgraphDefinitionToIPFS(subgraph) {
    let str = yaml.safeDump(subgraph.toJS(), { noRefs: true, sortKeys: true })
    let file = { path: 'subgraph.yaml', content: Buffer.from(str, 'utf-8') }
    return await this._uploadToIPFS(file)
  }

  async _uploadToIPFS(file) {
    try {
      let hash = (await this.ipfs.add([file]))[0].hash
      await this.ipfs.pin.add(hash)
      return hash
    } catch (e) {
      throw Error(`Failed to upload file to IPFS: ${e.message}`)
    }
  }
}

module.exports = Compiler
