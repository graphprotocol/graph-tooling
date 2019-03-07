const asc = require('assemblyscript/cli/asc')
const chalk = require('chalk')
const fs = require('fs-extra')
const immutable = require('immutable')
const path = require('path')
const yaml = require('js-yaml')
const toolbox = require('gluegun/toolbox')

const { step, withSpinner } = require('./command-helpers/spinner')
const Subgraph = require('./subgraph')
const Watcher = require('./watcher')
const ABI = require('./abi')

class Compiler {
  constructor(options) {
    this.options = options
    this.ipfs = options.ipfs
    this.sourceDir = path.dirname(options.subgraphManifest)

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

  async compile() {
    try {
      let subgraph = await this.loadSubgraph()
      let compiledSubgraph = await this.compileSubgraph(subgraph)
      let localSubgraph = await this.writeSubgraphToOutputDirectory(compiledSubgraph)

      if (this.ipfs !== undefined) {
        let ipfsHash = await this.uploadSubgraphToIPFS(localSubgraph)
        this.completed(ipfsHash)
        return ipfsHash
      } else {
        this.completed(path.join(this.options.outputDir, 'subgraph.yaml'))
        return true
      }
    } catch (e) {
      return false
    }
  }

  completed(ipfsHashOrPath) {
    toolbox.print.info('')
    toolbox.print.success(`Build completed: ${chalk.blue(ipfsHashOrPath)}`)
    toolbox.print.info('')
  }

  async loadSubgraph({ quiet } = { quiet: false }) {
    if (quiet) {
      return Subgraph.load(this.options.subgraphManifest)
    } else {
      return await withSpinner(
        `Load subgraph from ${this.displayPath(this.options.subgraphManifest)}`,
        `Failed to load subgraph from ${this.displayPath(this.options.subgraphManifest)}`,
        `Loaded subgraph from ${this.displayPath(this.options.subgraphManifest)} with warnings`,
        async spinner => {
          return Subgraph.load(this.options.subgraphManifest)
        }
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
        dataSource.getIn(['mapping', 'abis']).map(abi => {
          files.push(abi.get('file'))
        })
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

  _copySubgraphFile(maybeRelativeFile, sourceDir, targetDir, spinner) {
    let absoluteSourceFile = path.resolve(sourceDir, maybeRelativeFile)
    let relativeSourceFile = path.relative(sourceDir, absoluteSourceFile)
    let targetFile = path.join(targetDir, relativeSourceFile)
    step(spinner, 'Copy subgraph file', this.displayPath(targetFile))
    fs.mkdirsSync(path.dirname(targetFile))
    fs.copyFileSync(absoluteSourceFile, targetFile)
    return targetFile
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
      null,
      async spinner => {
        subgraph = subgraph.update('dataSources', dataSources =>
          dataSources.map(dataSource =>
            dataSource.updateIn(['mapping', 'file'], mappingPath =>
              this._compileDataSourceMapping(dataSource, mappingPath, spinner)
            )
          )
        )

        return subgraph
      }
    )
  }

  _compileDataSourceMapping(dataSource, mappingPath, spinner) {
    try {
      let dataSourceName = dataSource.getIn(['name'])

      let outFile = path.join(
        this.subgraphDir(this.options.outputDir, dataSource),
        this.options.outputFormat == 'wasm'
          ? `${dataSourceName}.wasm`
          : `${dataSourceName}.wast`
      )

      step(
        spinner,
        'Compile data source:',
        `${dataSourceName} => ${this.displayPath(outFile)}`
      )

      let baseDir = this.sourceDir
      let inputFile = path.relative(baseDir, mappingPath)
      let outputFile = path.relative(baseDir, outFile)

      // Create output directory
      try {
        fs.mkdirsSync(path.dirname(outputFile))
      } catch (e) {
        throw e
      }

      let libs = path.join(baseDir, 'node_modules')
      let global = path.join(libs, '@graphprotocol', 'graph-ts', 'global', 'global.ts')
      global = path.relative(baseDir, global)

      asc.main(
        [inputFile, global, '--baseDir', baseDir, '--lib', libs, '--outFile', outputFile],
        {
          stdout: process.stdout,
          stderr: process.stdout,
        },
        e => {
          if (e != null) {
            throw e
          }
        }
      )
      return outputFile
    } catch (e) {
      throw Error(`Failed to compile data source mapping: ${e.message}`)
    }
  }

  async writeSubgraphToOutputDirectory(subgraph) {
    return await withSpinner(
      `Write compiled subgraph to ${`${this.displayPath(this.options.outputDir)}${
        toolbox.filesystem.separator
      }`}`,
      `Failed to write compiled subgraph to ${`${this.displayPath(
        this.options.outputDir
      )}${toolbox.filesystem.separator}`}`,
      null,
      async spinner => {
        // Copy schema and update its path
        subgraph = subgraph.updateIn(['schema', 'file'], schemaFile =>
          path.relative(
            this.options.outputDir,
            this._copySubgraphFile(
              schemaFile,
              this.sourceDir,
              this.options.outputDir,
              spinner
            )
          )
        )

        // Copy data source files and update their paths
        subgraph = subgraph.update('dataSources', dataSources => {
          return dataSources.map(dataSource =>
            dataSource
              .updateIn(['mapping', 'abis'], abis =>
                abis.map(abi =>
                  abi.update('file', abiFile => {
                    let abiData = ABI.load(abi.get('name'), abiFile)
                    return path.relative(
                      this.options.outputDir,
                      this._writeSubgraphFile(
                        abiFile,
                        JSON.stringify(abiData.data.toJS(), null, 2),
                        this.sourceDir,
                        this.subgraphDir(this.options.outputDir, dataSource),
                        spinner
                      )
                    )
                  })
                )
              )
              // The mapping file is already being written to the output
              // directory by the AssemblyScript compiler
              .updateIn(['mapping', 'file'], mappingFile =>
                path.relative(this.options.outputDir, mappingFile)
              )
          )
        })

        // Write the subgraph manifest itself
        let outputFilename = path.join(this.options.outputDir, 'subgraph.yaml')
        step(spinner, 'Write subgraph manifest', this.displayPath(outputFilename))
        Subgraph.write(subgraph, outputFilename)

        return subgraph
      }
    )
  }

  async uploadSubgraphToIPFS(subgraph) {
    return withSpinner(
      `Upload subgraph to IPFS`,
      `Failed to upload subgraph to IPFS`,
      null,
      async spinner => {
        // Collect all source (path -> hash) updates to apply them later
        let updates = []

        // Upload the schema to IPFS
        updates.push({
          keyPath: ['schema', 'file'],
          value: await this._uploadFileToIPFS(
            subgraph.getIn(['schema', 'file']),
            spinner
          ),
        })

        // Upload the ABIs of all data sources to IPFS
        for (let [i, dataSource] of subgraph.get('dataSources').entries()) {
          for (let [j, abi] of dataSource.getIn(['mapping', 'abis']).entries()) {
            updates.push({
              keyPath: ['dataSources', i, 'mapping', 'abis', j, 'file'],
              value: await this._uploadFileToIPFS(abi.get('file'), spinner),
            })
          }
        }

        // Upload all mappings
        for (let [i, dataSource] of subgraph.get('dataSources').entries()) {
          updates.push({
            keyPath: ['dataSources', i, 'mapping', 'file'],
            value: await this._uploadFileToIPFS(
              dataSource.getIn(['mapping', 'file']),
              spinner
            ),
          })
        }

        // Apply all updates to the subgraph
        for (let update of updates) {
          subgraph = subgraph.setIn(update.keyPath, update.value)
        }

        // Upload the subgraph itself
        return await this._uploadSubgraphDefinitionToIPFS(subgraph, spinner)
      }
    )
  }

  async _uploadFileToIPFS(maybeRelativeFile, spinner) {
    let absoluteFile = path.resolve(this.options.outputDir, maybeRelativeFile)
    step(spinner, 'Add file to IPFS', this.displayPath(absoluteFile))
    let content = Buffer.from(fs.readFileSync(absoluteFile), 'utf-8')
    let hash = await this._uploadToIPFS({
      path: path.relative(this.options.outputDir, absoluteFile),
      content: content,
    })
    step(spinner, '              ..', hash)
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
