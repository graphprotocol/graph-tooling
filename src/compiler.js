const asc = require('assemblyscript/cli/asc')
const chalk = require('chalk')
const fs = require('fs-extra')
const immutable = require('immutable')
const path = require('path')
const yaml = require('js-yaml')

const Logger = require('./logger')
const Subgraph = require('./subgraph')
const TypeGenerator = require('./type-generator')
const Watcher = require('./watcher')
const ABI = require('./abi')

class Compiler {
  constructor(options) {
    this.options = options
    this.ipfs = options.ipfs
    this.sourceDir = path.dirname(options.subgraphManifest)
    this.logger = new Logger(this.ipfs !== undefined ? 4 : 3, {
      verbosity: this.options.logger.verbosity,
    })

    process.on('uncaughtException', function(e) {
      this.logger.error('UNCAUGHT EXCEPTION:', e)
    })
  }

  subgraphDir(parent, subgraph) {
    return path.join(parent, subgraph.get('name'))
  }

  displayPath(p) {
    if (p.indexOf(this.sourceDir) >= 0) {
      return p.replace(this.sourceDir, '<src>')
    } else {
      return path.relative(process.cwd(), p)
    }
  }

  async compile() {
    try {
      this.logger.currentStep = 0
      this.logger.step('Load subgraph:', this.options.subgraphManifest)
      let subgraph = this.loadSubgraph()

      let compiledSubgraph = this.compileSubgraph(subgraph)
      let localSubgraph = this.writeSubgraphToOutputDirectory(compiledSubgraph)

      if (this.ipfs !== undefined) {
        let ipfsHash = await this.uploadSubgraphToIPFS(localSubgraph)
        this.completed(ipfsHash)
        return ipfsHash
      } else {
        this.completed(path.join(this.options.outputDir, 'subgraph.yaml'))
        return true
      }
    } catch (e) {
      this.logger.error('Failed to compile subgraph', e)
      return false
    }
  }

  completed(ipfsHashOrPath) {
    this.logger.status('Build completed')
    this.logger.status(chalk.bold(chalk.blue('Subgraph:')), ipfsHashOrPath)
    this.logger.note('')
  }

  loadSubgraph() {
    try {
      return Subgraph.load(this.options.subgraphManifest)
    } catch (e) {
      throw Error(`Failed to load subgraph: ${e.message}`)
    }
  }

  getFilesToWatch() {
    try {
      let files = []
      let subgraph = this.loadSubgraph()

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
      throw Error(`Failed to parse subgraph file locations: ${e}`)
    }
  }

  async watchAndCompile(onCompiled = undefined) {
    let compiler = this

    // Create watcher and recompile once and then on every change to a watched file
    let watcher = new Watcher({
      onReady: () => compiler.logger.status('Watching subgraph files'),
      onTrigger: async file => {
        if (file !== undefined) {
          compiler.logger.status('File change detected:', this.displayPath(file))
        }
        let ipfsHash = await compiler.compile()
        if (onCompiled !== undefined) {
          onCompiled(ipfsHash)
        }
      },
      onCollectFiles: () => compiler.getFilesToWatch(),
      onError: error => compiler.logger.error('Error:', error),
    })

    // Catch keyboard interrupt: close watcher and exit process
    process.on('SIGINT', () => {
      watcher.close()
      process.exit()
    })

    try {
      watcher.watch()
    } catch (e) {
      this.logger.error('Error:', e)
    }
  }

  _copySubgraphFile(maybeRelativeFile, sourceDir, targetDir) {
    let absoluteSourceFile = path.resolve(sourceDir, maybeRelativeFile)
    let relativeSourceFile = path.relative(sourceDir, absoluteSourceFile)
    let targetFile = path.join(targetDir, relativeSourceFile)
    this.logger.note('Copy subgraph file:', this.displayPath(targetFile))
    fs.mkdirsSync(path.dirname(targetFile))
    fs.copyFileSync(absoluteSourceFile, targetFile)
    return targetFile
  }

  _writeSubgraphFile(maybeRelativeFile, data, sourceDir, targetDir) {
    let absoluteSourceFile = path.resolve(sourceDir, maybeRelativeFile)
    let relativeSourceFile = path.relative(sourceDir, absoluteSourceFile)
    let targetFile = path.join(targetDir, relativeSourceFile)
    this.logger.note('Write subgraph file:', this.displayPath(targetFile))
    fs.mkdirsSync(path.dirname(targetFile))
    fs.writeFileSync(targetFile, data)
    return targetFile
  }

  compileSubgraph(subgraph) {
    try {
      this.logger.step('Compile subgraph')

      subgraph = subgraph.update('dataSources', dataSources =>
        dataSources.map(dataSource =>
          dataSource.updateIn(['mapping', 'file'], mappingPath =>
            this._compileDataSourceMapping(dataSource, mappingPath)
          )
        )
      )

      return subgraph
    } catch (e) {
      throw Error(`Failed to compile subgraph: ${e}`)
    }
  }

  _compileDataSourceMapping(dataSource, mappingPath) {
    try {
      let dataSourceName = dataSource.getIn(['name'])

      let outFile = path.join(
        this.subgraphDir(this.options.outputDir, dataSource),
        this.options.outputFormat == 'wasm'
          ? `${dataSourceName}.wasm`
          : `${dataSourceName}.wast`
      )

      this.logger.note(
        'Compile data source mapping:',
        dataSourceName,
        '=>',
        this.displayPath(outFile)
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

      let libs = path.join(baseDir, 'node_modules');
      let global = path.join(libs, '@graphprotocol', 'graph-ts', 'global', 'global.ts')
      global = path.relative(baseDir, global)

      asc.main(
        [
          inputFile,
          global,
          '--baseDir',
          baseDir,
          '--lib',
          libs,
          '--outFile',
          outputFile,
        ],
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
      throw Error(`Failed to compile data source mapping: ${e}`)
    }
  }

  writeSubgraphToOutputDirectory(subgraph) {
    try {
      this.logger.step('Write compiled subgraph to output directory')

      // Copy schema and update its path
      subgraph = subgraph.updateIn(['schema', 'file'], schemaFile =>
        path.relative(
          this.options.outputDir,
          this._copySubgraphFile(schemaFile, this.sourceDir, this.options.outputDir)
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
                      this.subgraphDir(this.options.outputDir, dataSource)
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
      this.logger.note('Write subgraph manifest:', this.displayPath(outputFilename))
      Subgraph.write(subgraph, outputFilename)

      return subgraph
    } catch (e) {
      throw Error(`Failed to write compiled subgraph to output directory: ${e}`)
    }
  }

  async uploadSubgraphToIPFS(subgraph) {
    this.logger.step('Upload subgraph to IPFS')

    try {
      // Collect all source (path -> hash) updates to apply them later
      let updates = []

      // Upload the schema to IPFS
      updates.push({
        keyPath: ['schema', 'file'],
        value: await this._uploadFileToIPFS(subgraph.getIn(['schema', 'file'])),
      })

      // Upload the ABIs of all data sources to IPFS
      for (let [i, dataSource] of subgraph.get('dataSources').entries()) {
        for (let [j, abi] of dataSource.getIn(['mapping', 'abis']).entries()) {
          updates.push({
            keyPath: ['dataSources', i, 'mapping', 'abis', j, 'file'],
            value: await this._uploadFileToIPFS(abi.get('file')),
          })
        }
      }

      // Upload all mappings
      for (let [i, dataSource] of subgraph.get('dataSources').entries()) {
        updates.push({
          keyPath: ['dataSources', i, 'mapping', 'file'],
          value: await this._uploadFileToIPFS(dataSource.getIn(['mapping', 'file'])),
        })
      }

      // Apply all updates to the subgraph
      for (let update of updates) {
        subgraph = subgraph.setIn(update.keyPath, update.value)
      }

      // Upload the subgraph itself
      return await this._uploadSubgraphDefinitionToIPFS(subgraph)
    } catch (e) {
      throw new Error(`Failed to upload subgraph to IPFS: ${e}`)
    }
  }

  async _uploadFileToIPFS(maybeRelativeFile) {
    let absoluteFile = path.resolve(this.options.outputDir, maybeRelativeFile)
    this.logger.note('Add file to IPFS:', this.displayPath(absoluteFile))
    let content = Buffer.from(fs.readFileSync(absoluteFile), 'utf-8')
    let hash = await this._uploadToIPFS({
      path: path.relative(this.options.outputDir, absoluteFile),
      content: content,
    })
    this.logger.note('               ..', hash)
    return immutable.fromJS({ '/': `/ipfs/${hash}` })
  }

  async _uploadSubgraphDefinitionToIPFS(subgraph) {
    let str = yaml.safeDump(subgraph.toJS(), { noRefs: true, sortKeys: true })
    let file = { path: 'subgraph.yaml', content: Buffer.from(str, 'utf-8') }
    return await this._uploadToIPFS(file)
  }

  async _uploadToIPFS(file) {
    try {
      let hash = (await this.ipfs.files.add([file]))[0].hash
      await this.ipfs.pin.add(hash)
      return hash
    } catch (e) {
      throw Error(`Failed to upload file to IPFS: ${e}`)
    }
  }
}

module.exports = Compiler
