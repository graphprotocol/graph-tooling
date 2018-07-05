const asc = require('assemblyscript/cli/asc')
const chalk = require('chalk')
const fs = require('fs-extra')
const path = require('path')
const immutable = require('immutable')
const yaml = require('js-yaml')

const DataSource = require('./data-source')
const Logger = require('./logger')
const TypeGenerator = require('./type-generator')

class Compiler {
  constructor(options) {
    this.options = options
    this.ipfs = options.ipfs
    this.sourceDir = path.dirname(options.dataSourceFile)
    this.logger = new Logger(11)
  }

  dataSetDir(parent, dataSet) {
    return path.join(parent, dataSet.getIn(['data', 'name']))
  }

  displayPath(p) {
    if (p.indexOf(this.buildDir) >= 0) {
      return p.replace(this.buildDir, '<build>')
    } else {
      return path.relative(process.cwd(), p)
    }
  }

  async compile() {
    let dataSource = this.loadDataSource()

    this.buildDir = this.createBuildDirectory()

    let dataSourceInBuildDir = this.copyDataSource(dataSource)
    let typeFiles = this.generateTypes(dataSourceInBuildDir)

    this.copyRuntimeFiles(dataSourceInBuildDir)
    this.addTypesToRuntime(typeFiles)
    this.addMappingsToRuntime(dataSourceInBuildDir)
    this.createOutputDirectory()

    let compiledDataSource = this.compileDataSource(dataSourceInBuildDir)
    let localDataSource = this.writeDataSourceToOutputDirectory(compiledDataSource)
    let hash = await this.uploadDataSourceToIPFS(localDataSource)

    this.logger.info('')
    this.logger.info(chalk.green('Completed'))
    this.logger.info('')
    this.logger.info('%s %s', chalk.bold(chalk.blue('Data source:')), hash)
    this.logger.info('')
  }

  loadDataSource() {
    try {
      this.logger.step('Load data source:', this.options.dataSourceFile)
      return DataSource.load(this.options.dataSourceFile)
    } catch (e) {
      this.logger.fatal('Failed to load data source:', e)
    }
  }

  createBuildDirectory() {
    try {
      this.logger.step('Create build directory')

      // Create temporary directory
      let buildDir = fs.mkdtempSync('.the-graph-wasm')

      // Ensure the temporary directory is destroyed on exit
      process.on('exit', () => fs.removeSync(buildDir))
      process.on('SIGINT', () => fs.removeSync(buildDir))
      process.on('uncaughtException', () => fs.removeSync(buildDir))

      return buildDir
    } catch (e) {
      this.logger.fatal('Failed to create build directory:', e)
    }
  }

  copyDataSource(dataSource) {
    try {
      this.logger.step('Copy data source to build directory')

      // Copy schema and update its path
      dataSource = dataSource.updateIn(['schema', 'source', 'path'], schemaPath =>
        this._copyDataSourceFile(schemaPath, this.sourceDir, this.buildDir)
      )

      // Copy data set files and update their paths
      dataSource = dataSource.updateIn(['datasets'], dataSets => {
        return dataSets.map(dataSet =>
          dataSet
            .updateIn(['mapping', 'abis'], abis =>
              abis.map(abi =>
                abi.updateIn(['source', 'path'], abiPath =>
                  this._copyDataSourceFile(
                    abiPath,
                    this.sourceDir,
                    this.dataSetDir(this.buildDir, dataSet)
                  )
                )
              )
            )
            .updateIn(['mapping', 'source', 'path'], mappingPath =>
              this._copyDataSourceFile(
                mappingPath,
                this.sourceDir,
                this.dataSetDir(this.buildDir, dataSet)
              )
            )
        )
      })

      return dataSource
    } catch (e) {
      this.logger.fatal('Failed to copy data source files:', e)
    }
  }

  _copyDataSourceFile(maybeRelativeFile, sourceDir, targetDir) {
    let absoluteSourceFile = path.resolve(sourceDir, maybeRelativeFile)
    let relativeSourceFile = path.relative(sourceDir, absoluteSourceFile)
    let targetFile = path.join(targetDir, relativeSourceFile)
    this.logger.note('Copy data source file:', this.displayPath(targetFile))
    fs.mkdirsSync(path.dirname(targetFile))
    fs.copyFileSync(absoluteSourceFile, targetFile)
    return targetFile
  }

  generateTypes(dataSource) {
    this.logger.step('Generate types from contract ABIs')

    let generator = new TypeGenerator({
      dataSource,
      outputDir: this.buildDir,
      displayPath: this.displayPath.bind(this),
      logger: {
        prefix: chalk.grey(' '),
      },
    })
    return generator.generateTypes()
  }

  copyRuntimeFiles(dataSource) {
    this.logger.step('Copy runtime to build directory')
    dataSource.get('datasets').map(dataSet => {
      this._copyRuntimeFile(this.dataSetDir(this.buildDir, dataSet), 'index.ts')
    })
  }

  _copyRuntimeFile(targetDir, basename) {
    let target = path.join(targetDir, basename)
    this.logger.note('Copy runtime file:', this.displayPath(target))
    fs.copyFileSync(path.join(__dirname, '..', 'src', basename), target)
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
          path.join(this.dataSetDir(this.buildDir, typeFileInfo.dataSet), 'index.ts'),
          '\n' + types + '\n',
          'utf-8'
        )
      })
    } catch (e) {
      this.logger.fatal('Failed to add types to runtime:', e)
    }
  }

  addMappingsToRuntime(dataSource) {
    this.logger.step('Add mappings to runtime')
    try {
      dataSource.get('datasets').map(dataSet => {
        let mapping = fs.readFileSync(dataSet.getIn(['mapping', 'source', 'path']))
        fs.appendFileSync(
          path.join(this.dataSetDir(this.buildDir, dataSet), 'index.ts'),
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

  compileDataSource(dataSource) {
    try {
      this.logger.step('Compile data source')

      dataSource = dataSource.updateIn(['datasets'], dataSets =>
        dataSets.map(dataSet =>
          dataSet.updateIn(['mapping', 'source', 'path'], mappingPath =>
            this._compileDataSetMapping(dataSet, mappingPath)
          )
        )
      )

      return dataSource
    } catch (e) {
      this.logger.fatal('Failed to compile data source:', e)
    }
  }

  _compileDataSetMapping(dataSet, mappingPath) {
    try {
      let dataSetName = dataSet.getIn(['data', 'name'])

      let outputFile = path.join(
        this.dataSetDir(this.buildDir, dataSet),
        this.options.outputFormat == 'wasm'
          ? `${dataSetName}.wasm`
          : `${dataSetName}.wast`
      )

      this.logger.note(
        'Compile data set runtime:',
        dataSetName,
        '=>',
        this.displayPath(outputFile)
      )

      asc.main(
        [
          '--baseDir',
          this.dataSetDir(this.buildDir, dataSet),
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
            this.logger.fatal('Failed to compile data set mapping:', e)
          }
        }
      )

      return outputFile
    } catch (e) {
      this.logger.fatal('Failed to compile data set mapping:', e)
    }
  }

  writeDataSourceToOutputDirectory(dataSource) {
    try {
      this.logger.step('Write compiled data source to output directory')

      // Copy schema and update its path
      dataSource = dataSource.updateIn(['schema', 'source', 'path'], schemaPath =>
        path.relative(
          this.options.outputDir,
          this._copyDataSourceFile(
            path.relative(this.buildDir, schemaPath),
            this.buildDir,
            this.options.outputDir
          )
        )
      )

      // Copy data set files and update their paths
      dataSource = dataSource.updateIn(['datasets'], dataSets => {
        return dataSets.map(dataSet =>
          dataSet
            .updateIn(['mapping', 'abis'], abis =>
              abis.map(abi =>
                abi.updateIn(['source', 'path'], abiPath =>
                  path.relative(
                    this.options.outputDir,
                    this._copyDataSourceFile(
                      path.relative(this.buildDir, abiPath),
                      this.buildDir,
                      this.options.outputDir
                    )
                  )
                )
              )
            )
            .updateIn(['mapping', 'source', 'path'], mappingPath =>
              path.relative(
                this.options.outputDir,
                this._copyDataSourceFile(
                  path.relative(this.buildDir, mappingPath),
                  this.buildDir,
                  this.options.outputDir
                )
              )
            )
        )
      })

      // Write the generated index.ts (for debugging purposes)
      dataSource.get('datasets').map(dataSet => {
        let target = path.join(
          this.dataSetDir(this.options.outputDir, dataSet),
          `${dataSet.getIn(['data', 'name'])}.ts`
        )
        this.logger.note(
          'Write AssemblyScript runtime source:',
          path.relative(process.cwd(), target)
        )
        fs.copyFileSync(
          path.join(this.dataSetDir(this.buildDir, dataSet), 'index.ts'),
          target
        )
      })

      // Write the data source definition itself
      let outputFilename = path.join(this.options.outputDir, 'data-source.yaml')
      this.logger.note('Write data source definition:', this.displayPath(outputFilename))
      DataSource.write(dataSource, outputFilename)

      return dataSource
    } catch (e) {
      this.logger.fatal('Failed to write compiled data source to output directory:', e)
    }
  }

  async uploadDataSourceToIPFS(dataSource) {
    this.logger.step('Upload data source to IPFS')

    try {
      // Collect all source (path -> hash) updates to apply them later
      let updates = []

      // Upload the schema to IPFS
      updates.push({
        keyPath: ['schema', 'source'],
        value: await this._uploadSourceToIPFS(dataSource.getIn(['schema', 'source'])),
      })

      // Upload the ABIs of all data sets to IPFS
      for (let [i, dataSet] of dataSource.get('datasets').entries()) {
        for (let [j, abi] of dataSet.getIn(['mapping', 'abis']).entries()) {
          updates.push({
            keyPath: ['datasets', i, 'mapping', 'abis', j, 'source'],
            value: await this._uploadSourceToIPFS(abi.get('source')),
          })
        }
      }

      // Upload all mappings
      for (let [i, dataSet] of dataSource.get('datasets').entries()) {
        updates.push({
          keyPath: ['datasets', i, 'mapping', 'source'],
          value: await this._uploadSourceToIPFS(dataSet.getIn(['mapping', 'source'])),
        })
      }

      // Apply all updates to the data source
      for (let update of updates) {
        dataSource = dataSource.setIn(update.keyPath, update.value)
      }

      // Upload the data source itself
      return await this._uploadDataSourceDefinitionToIPFS(dataSource)
    } catch (e) {
      this.logger.fatal('Failed to upload data source to IPFS:', e)
    }
  }

  async _uploadSourceToIPFS(source) {
    let hash = await this._uploadFileToIPFS(source.get('path'))
    return immutable.fromJS({ '/': `/ipfs/${hash}` })
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
    return hash
  }

  async _uploadDataSourceDefinitionToIPFS(dataSource) {
    let str = yaml.safeDump(dataSource.toJS(), { noRefs: true, sortKeys: true })
    let file = { path: 'data-source.yaml', content: Buffer.from(str, 'utf-8') }
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
