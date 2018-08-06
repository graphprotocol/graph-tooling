const asc = require('assemblyscript/cli/asc')
const chalk = require('chalk')
const fs = require('fs-extra')
const path = require('path')
const immutable = require('immutable')
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
    this.logger.info(chalk.green('Build Completed'))
    this.logger.info('')
    this.logger.info('%s %s', chalk.bold(chalk.blue('Subgraph:')), hashOrFilename)
    this.logger.info('')
  }

  loadSubgraph() {
    try {
      this.logger.step('Load subgraph:', this.options.subgraphManifest)
      return Subgraph.load(this.options.subgraphManifest)
    } catch (e) {
      this.logger.fatal('Failed to load subgraph:', e)
    }
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
      this.logger.fatal('Failed to create build directory:', e)
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
      this.logger.fatal('Failed to copy subgraph files:', e)
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
      this.logger.fatal('Failed to add types to runtime:', e)
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
      this.logger.fatal('Failed to add mapping to runtime:', e)
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
      this.logger.fatal('Failed to create output directory:', e)
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
      this.logger.fatal('Failed to compile subgraph:', e)
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
            this.logger.fatal('Failed to compile data source mapping:', e)
          }
        }
      )

      return outputFile
    } catch (e) {
      this.logger.fatal('Failed to compile data source mapping:', e)
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
      this.logger.fatal('Failed to write compiled subgraph to output directory:', e)
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
      this.logger.fatal('Failed to upload subgraph to IPFS:', e)
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
      this.logger.fatal('Failed to upload file to IPFS:', e)
    }
  }
}

module.exports = Compiler
