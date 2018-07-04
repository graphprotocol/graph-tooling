const asc = require('assemblyscript/cli/asc')
const chalk = require('chalk')
const fs = require('fs-extra')
const path = require('path')

const DataSource = require('./data-source')
const Logger = require('./logger')
const TypeGenerator = require('./type-generator')

class Compiler {
  constructor(options) {
    this.options = options
    this.sourceDir = path.dirname(options.dataSourceFile)
    this.logger = new Logger(10)
  }

  compile() {
    let dataSource = this.loadDataSource()
    let buildDir = this.createBuildDirectory()

    let dataSourceInBuildDir = this.copyDataSource(dataSource, buildDir)
    let typeFiles = this.generateTypes(dataSourceInBuildDir, buildDir)

    this.copyRuntimeFiles(dataSourceInBuildDir, buildDir)
    this.addTypesToRuntime(buildDir, typeFiles)
    this.addMappingsToRuntime(dataSourceInBuildDir, buildDir)
    this.createOutputDirectory()

    let compiledDataSource = this.compileDataSource(dataSourceInBuildDir, buildDir)

    let finalDataSource = this.writeDataSourceToOutputDirectory(
      compiledDataSource,
      buildDir
    )
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

  copyDataSource(dataSource, buildDir) {
    try {
      this.logger.step('Copy data source to build directory')

      // Copy schema and update its path
      dataSource = dataSource.updateIn(['schema', 'source', 'path'], schemaPath =>
        this._copyDataSourceFile(schemaPath, this.sourceDir, buildDir)
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
                    path.join(buildDir, dataSet.getIn(['data', 'name']))
                  )
                )
              )
            )
            .updateIn(['mapping', 'source', 'path'], mappingPath =>
              this._copyDataSourceFile(
                mappingPath,
                this.sourceDir,
                path.join(buildDir, dataSet.getIn(['data', 'name']))
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
    this.logger.note('Copy data source file:', relativeSourceFile)
    fs.mkdirsSync(path.dirname(targetFile))
    fs.copyFileSync(absoluteSourceFile, targetFile)
    return targetFile
  }

  generateTypes(dataSource, buildDir) {
    this.logger.step('Generate types from contract ABIs')

    let generator = new TypeGenerator({
      dataSource,
      outputDir: buildDir,
      logger: {
        prefix: '......',
      },
    })
    return generator.generateTypes()
  }

  copyRuntimeFiles(dataSource, buildDir) {
    this.logger.step('Copy runtime to build directory')
    dataSource.get('datasets').map(dataSet => {
      this._copyRuntimeFile(
        path.join(buildDir, dataSet.getIn(['data', 'name'])),
        'index.ts'
      )
    })
  }

  _copyRuntimeFile(buildDir, basename) {
    let target = path.join(buildDir, basename)
    this.logger.note('Copy runtime file:', path.relative(process.cwd(), target))
    fs.copyFileSync(path.join(__dirname, '..', 'src', basename), target)
  }

  addTypesToRuntime(buildDir, typeFiles) {
    this.logger.step('Add generated types to runtime')
    try {
      typeFiles.forEach(typeFileInfo => {
        this.logger.note(
          'Add types from file to runtime:',
          path.relative(process.cwd(), typeFileInfo.outputFile)
        )

        let types = fs.readFileSync(typeFileInfo.outputFile)
        fs.appendFileSync(
          path.join(buildDir, typeFileInfo.dataSet.getIn(['data', 'name']), 'index.ts'),
          '\n' + types + '\n',
          'utf-8'
        )
      })
    } catch (e) {
      this.logger.fatal('Failed to add types to runtime:', e)
    }
  }

  addMappingsToRuntime(dataSource, buildDir) {
    this.logger.step('Add mappings to runtime')
    try {
      dataSource.get('datasets').map(dataSet => {
        let mapping = fs.readFileSync(dataSet.getIn(['mapping', 'source', 'path']))
        fs.appendFileSync(
          path.join(buildDir, dataSet.getIn(['data', 'name']), 'index.ts'),
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
      this.logger.step('Create output directory:', this.options.outputDir)
      fs.mkdirsSync(this.options.outputDir)
    } catch (e) {
      this.logger.fatal('Failed to create output directory:', e)
    }
  }

  compileDataSource(dataSource, buildDir) {
    try {
      this.logger.step('Compile data source')

      dataSource = dataSource.updateIn(['datasets'], dataSets =>
        dataSets.map(dataSet =>
          dataSet.updateIn(['mapping', 'source', 'path'], mappingPath =>
            this._compileDataSetMapping(dataSet, mappingPath, buildDir)
          )
        )
      )

      return dataSource
    } catch (e) {
      this.logger.fatal('Failed to compile data source:', e)
    }
  }

  _compileDataSetMapping(dataSet, mappingPath, buildDir) {
    try {
      let dataSetName = dataSet.getIn(['data', 'name'])

      let outputFile = path.join(
        buildDir,
        dataSet.getIn(['data', 'name']),
        this.options.outputFormat == 'wasm'
          ? `${dataSetName}.wasm`
          : `${dataSetName}.wast`
      )

      this.logger.note(
        'Compile data set runtime:',
        dataSetName,
        '=>',
        path.relative(process.cwd(), outputFile)
      )

      asc.main(
        [
          '--baseDir',
          path.join(buildDir, dataSet.getIn(['data', 'name'])),
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

  writeDataSourceToOutputDirectory(dataSource, buildDir) {
    try {
      this.logger.step('Write compiled data source to output directory')

      // Copy schema and update its path
      dataSource = dataSource.updateIn(['schema', 'source', 'path'], schemaPath =>
        path.relative(
          this.options.outputDir,
          this._copyDataSourceFile(
            path.relative(buildDir, schemaPath),
            buildDir,
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
                      path.relative(buildDir, abiPath),
                      buildDir,
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
                  path.relative(buildDir, mappingPath),
                  buildDir,
                  this.options.outputDir
                )
              )
            )
        )
      })

      // Write the generated index.ts (for debugging purposes)
      dataSource.get('datasets').map(dataSet => {
        let dataSetName = dataSet.getIn(['data', 'name'])
        let target = path.join(this.options.outputDir, dataSetName, `${dataSetName}.ts`)
        this.logger.note(
          'Write AssemblyScript runtime source:',
          path.relative(process.cwd(), target)
        )
        fs.copyFileSync(path.join(buildDir, dataSetName, 'index.ts'), target)
      })

      // Write the data source definition itself
      let outputFilename = path.join(this.options.outputDir, 'data-source.yaml')
      this.logger.note(
        'Write data source definition:',
        path.relative(process.cwd(), outputFilename)
      )
      DataSource.write(dataSource, outputFilename)

      return dataSource
    } catch (e) {
      this.logger.fatal('Failed to write compiled data source to output directory:', e)
    }
  }
}

module.exports = Compiler
