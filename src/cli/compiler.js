const asc = require('assemblyscript/cli/asc')
const chalk = require('chalk')
const chokidar = require('chokidar')
const cluster = require('cluster')
const fs = require('fs-extra')
const immutable = require('immutable')
const path = require('path')
const yaml = require('js-yaml')

const Logger = require('./logger')
const Subgraph = require('./subgraph')
const TypeGenerator = require('./type-generator')

class Compiler {
  constructor(options) {
    this.options = options
    this.ipfs = options.ipfs
    this.sourceDir = path.dirname(options.subgraphManifest)
    this.logger = new Logger(11, { verbosity: this.options.verbosity })
  }

  subgraphDir(parent, subgraph) {
    return path.join(parent, subgraph.get('name'))
  }

  displayPath(p) {
    if (p.indexOf(this.buildDir) >= 0) {
      return p.replace(this.buildDir, '<build>')
    } else {
      return path.relative(process.cwd(), p)
    }
  }

  async compile() {
    try {
      this.logger.currentStep = 0
      this.logger.step('Load subgraph:', this.options.subgraphManifest)
      let subgraph = this.loadSubgraph()

      this.buildDir = this.createBuildDirectory()

      let subgraphInBuildDir = this.copySubgraph(subgraph)
      let typeFiles = this.generateTypes(subgraphInBuildDir)

      this.copyRuntimeFiles(subgraphInBuildDir)
      this.addTypesToRuntime(typeFiles)
      this.addMappingsToRuntime(subgraphInBuildDir)
      this.createOutputDirectory()

      let compiledSubgraph = this.compileSubgraph(subgraphInBuildDir)
      let localSubgraph = this.writeSubgraphToOutputDirectory(compiledSubgraph)

      let hashOrFilename =
        this.ipfs !== undefined
          ? await this.uploadSubgraphToIPFS(localSubgraph)
          : path.join(this.options.outputDir, 'subgraph.yaml')

      this.logger.info('')
      this.logger.info(chalk.magenta('Build completed'))
      this.logger.info('')
      this.logger.info('%s %s', chalk.bold(chalk.blue('Subgraph:')), hashOrFilename)
      this.logger.info('')
    } catch (e) {
      if (e instanceof Error) {
        if(e.hasOwnProperty('message')) {
          this.logger.fatal(e.message)
        } else {
          this.logger.fatal(e)
        }
        if(e.hasOwnProperty('stack')) {
          this.logger.note(e.stack.split('\n').slice(1).join('\n'))
        }
      } else {
        this.logger.fatal("Failed to compile subgraph", e)
      }
    }
  }

  loadSubgraph() {
    try {
      return Subgraph.load(this.options.subgraphManifest)
    } catch (e) {
      throw Error('Failed to load subgraph')
    }
  }

  getFilesToWatch() {
    try {
      let allFiles = []
      let subgraph = this.loadSubgraph()

      // Add all file paths specified in manifest
      allFiles.push(subgraph.getIn(['schema', 'file']))
      subgraph.get('dataSources').map(dataSource => {
          allFiles.push(dataSource.getIn(['mapping', 'file']))
          dataSource.getIn(['mapping', 'abis']).map(abi => {
            allFiles.push(abi.get('file'))
          })
      })

      // Make paths absolute
      let allAbsolutePaths = allFiles.map(file => {
        return path.resolve(this.sourceDir, file)
      })
      return allAbsolutePaths
    } catch (e) {
      throw Error('Failed to parse subgraph file locations')
    }
  }

  watchAndCompile() {
    let compiler = this
    let watchedFiles = this.getFilesToWatch()
    compiler.compile()

    // Initialize watcher that reruns compiler
    let watcher = chokidar.watch(this.options.subgraphManifest, {
      persistent: true,
      ignoreInitial: true,
      atomic: 500
    })
    watcher
      .on('ready', function () {
        compiler.logger.info('')
        compiler.logger.info(chalk.grey('Watching relevant manifest files'))
      })
      .on('change', changedFile => {
        compiler.logger.info('')
        compiler.logger.info('%s %s',
          chalk.grey('File change detected: '),
          compiler.displayPath(changedFile)
        )

        // Convert to absolute paths for comparison
        let manifestAbsolute =
          (path.resolve(compiler.options.subgraphManifest) === path.normalize(compiler.options.subgraphManifest))
          ? this.options.subgraphManifest
          : path.resolve(compiler.sourceDir, compiler.options.subgraphManifest)
        let changedFileAbsolute = (path.resolve(changedFile) === path.normalize(changedFile))
          ? changedFile
          : path.resolve(compiler.sourceDir, changedFile)

        if (changedFileAbsolute === manifestAbsolute) {
          // Update watcher based on changes to manifest
          let updatedWatchFiles = compiler.getFilesToWatch()
          let addedFiles = updatedWatchFiles.filter(file => {
            return watchedFiles.indexOf(file) === -1
          })
          let removedFiles = watchedFiles.filter(file => {
            return updatedWatchFiles.indexOf(file) === -1
          })
          watchedFiles = updatedWatchFiles
          watcher.add(addedFiles)
          watcher.unwatch(removedFiles)

          if (addedFiles.length >= 1) {
            compiler.logger.note(
              'Now watching: ',
              addedFiles.map(file => compiler.displayPath(file)).join(', ')
            )
          }
          if (removedFiles.length >= 1) {
            compiler.logger.note(
              'No longer watching: ',
              removedFiles.map(file => compiler.displayPath(file)).join(', ')
            )
          }
        }
        compiler.compile()
      })
      .on('error', error => {
        throw Error('Watcher error')
      })
    watcher.add(watchedFiles)

    process.on('SIGINT', () => {
      watcher.close()
      process.exit()
    })
    process.on('uncaughtException', function (err) {
      compiler.logger.fatal('UNCAUGHT EXCEPTION: ', err)
      watcher.close()
    })
  }

  createBuildDirectory() {
    try {
      this.logger.step('Create build directory')

      // Create temporary directory
      let buildDir = fs.mkdtempSync('.graph')

      // Ensure the temporary directory is destroyed on exit
      process.on('exit', () => fs.removeSync(buildDir))
      process.on('SIGINT', () => fs.removeSync(buildDir))
      process.on('uncaughtException', () => fs.removeSync(buildDir))

      return buildDir
    } catch (e) {
      throw new Error('Failed to create build directory')
    }
  }

  copySubgraph(subgraph) {
    try {
      this.logger.step('Copy subgraph to build directory')

      // Copy schema and update its path
      subgraph = subgraph.updateIn(['schema', 'file'], schemaFile =>
        this._copySubgraphFile(schemaFile, this.sourceDir, this.buildDir)
      )

      // Copy data source files and update their paths
      subgraph = subgraph.update('dataSources', dataSources => {
        return dataSources.map(dataSource =>
          dataSource
            .updateIn(['mapping', 'abis'], abis =>
              abis.map(abi =>
                abi.update('file', abiFile =>
                  this._copySubgraphFile(
                    abiFile,
                    this.sourceDir,
                    this.subgraphDir(this.buildDir, dataSource)
                  )
                )
              )
            )
            .updateIn(['mapping', 'file'], mappingFile =>
              this._copySubgraphFile(
                mappingFile,
                this.sourceDir,
                this.subgraphDir(this.buildDir, dataSource)
              )
            )
        )
      })

      return subgraph
    } catch (e) {
      throw Error('Failed to copy subgraph files')
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

  generateTypes(subgraph) {
    this.logger.step('Generate types from contract ABIs')

    let generator = new TypeGenerator({
      subgraph: subgraph,
      outputDir: this.buildDir,
      displayPath: this.displayPath.bind(this),
      logger: {
        prefix: chalk.grey(' '),
      },
    })
    return generator.generateTypes()
  }

  copyRuntimeFiles(subgraph) {
    this.logger.step('Copy runtime to build directory')
    subgraph.get('dataSources').map(dataSource => {
      this._copyRuntimeFile(this.subgraphDir(this.buildDir, dataSource), 'index.ts')
    })
  }

  _copyRuntimeFile(targetDir, basename) {
    let source = path.join(__dirname, '..', 'runtime', basename)
    let target = path.join(targetDir, basename)
    this.logger.note('Copy runtime file:', this.displayPath(target))
    fs.copyFileSync(source, target)
  }

  addTypesToRuntime(typeFiles) {
    this.logger.step('Add generated types to runtime')
    try {
      typeFiles.forEach(typeFileInfo => {
        this.logger.note(
          'Add types from file to runtime:',
          this.displayPath(typeFileInfo.outputFile)
        )

        let types = fs.readFileSync(typeFileInfo.outputFile)
        fs.appendFileSync(
          path.join(this.subgraphDir(this.buildDir, typeFileInfo.dataSource), 'index.ts'),
          '\n' + types + '\n',
          'utf-8'
        )
      })
    } catch (e) {
      throw Error('Failed to add types to runtime')
    }
  }

  addMappingsToRuntime(subgraph) {
    this.logger.step('Add mappings to runtime')
    try {
      subgraph.get('dataSources').map(dataSource => {
        let mapping = fs.readFileSync(dataSource.getIn(['mapping', 'file']))
        fs.appendFileSync(
          path.join(this.subgraphDir(this.buildDir, dataSource), 'index.ts'),
          '\n' + mapping + '\n',
          'utf-8'
        )
      })
    } catch (e) {
      throw Error('Failed to add mapping to runtime')
    }
  }

  createOutputDirectory() {
    try {
      this.logger.step(
        'Create output directory:',
        this.displayPath(this.options.outputDir)
      )
      fs.mkdirsSync(this.options.outputDir)
    } catch (e) {
      throw Error('Failed to create output directory')
    }
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
      throw Error('Failed to compile subgraph')
    }
  }

  _compileDataSourceMapping(dataSource, mappingPath) {
    try {
      let dataSourceName = dataSource.getIn(['name'])

      let outputFile = path.join(
        this.subgraphDir(this.buildDir, dataSource),
        this.options.outputFormat == 'wasm'
          ? `${dataSourceName}.wasm`
          : `${dataSourceName}.wast`
      )

      this.logger.note(
        'Compile data source mapping:',
        dataSourceName,
        '=>',
        this.displayPath(outputFile)
      )

      asc.main(
        [
          '--baseDir',
          this.subgraphDir(this.buildDir, dataSource),
          '--outFile',
          path.basename(outputFile),
          'index.ts',
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
      throw Error('Failed to compile data source mapping')
    }
  }

  writeSubgraphToOutputDirectory(subgraph) {
    try {
      this.logger.step('Write compiled subgraph to output directory')

      // Copy schema and update its path
      subgraph = subgraph.updateIn(['schema', 'file'], schemaFile =>
        path.relative(
          this.options.outputDir,
          this._copySubgraphFile(
            path.relative(this.buildDir, schemaFile),
            this.buildDir,
            this.options.outputDir
          )
        )
      )

      // Copy data source files and update their paths
      subgraph = subgraph.update('dataSources', dataSources => {
        return dataSources.map(dataSource =>
          dataSource
            .updateIn(['mapping', 'abis'], abis =>
              abis.map(abi =>
                abi.update('file', abiFile =>
                  path.relative(
                    this.options.outputDir,
                    this._copySubgraphFile(
                      path.relative(this.buildDir, abiFile),
                      this.buildDir,
                      this.options.outputDir
                    )
                  )
                )
              )
            )
            .updateIn(['mapping', 'file'], mappingFile =>
              path.relative(
                this.options.outputDir,
                this._copySubgraphFile(
                  path.relative(this.buildDir, mappingFile),
                  this.buildDir,
                  this.options.outputDir
                )
              )
            )
        )
      })

      // Write the generated index.ts (for debugging purposes)
      subgraph.get('dataSources').map(dataSource => {
        let target = path.join(
          this.subgraphDir(this.options.outputDir, dataSource),
          `${dataSource.get('name')}.ts`
        )
        this.logger.note('Write runtime source:', path.relative(process.cwd(), target))
        fs.copyFileSync(
          path.join(this.subgraphDir(this.buildDir, dataSource), 'index.ts'),
          target
        )
      })

      // Write the subgraph manifest itself
      let outputFilename = path.join(this.options.outputDir, 'subgraph.yaml')
      this.logger.note('Write subgraph manifest:', this.displayPath(outputFilename))
      Subgraph.write(subgraph, outputFilename)

      return subgraph
    } catch (e) {
      throw Error('Failed to write compiled subgraph to output directory')
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
      throw (new Error('Failed to upload subgraph to IPFS'))
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
      throw Error('Failed to upload file to IPFS')
    }
  }
}

module.exports = Compiler
