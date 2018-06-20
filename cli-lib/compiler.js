const asc = require('assemblyscript/cli/asc')
const chalk = require('chalk')
const fs = require('fs-extra')
const immutable = require('immutable')
const path = require('path')
const yaml = require('js-yaml')

class Compiler {
  constructor(options) {
    this.options = options
    this.sourceDir = path.dirname(options.dataSourceFile)
  }

  _logStep(step, subject, ...msg) {
    console.log(`[${step}/9]`, chalk.green(subject), ...msg)
  }

  compile() {
    let dataSource = this.loadDataSource()

    this.validateDataSource(dataSource)
    let buildDir = this.createBuildDirectory()
    let dataSourceInBuildDir = this.copyDataSource(dataSource, buildDir)
    this.copyRuntimeFiles(buildDir)
    this.mergeRuntimeAndMapping(buildDir)
    this.createOutputDirectory()

    let compiledDataSource = this.compileDataSource(dataSourceInBuildDir, buildDir)

    let finalDataSource = this.writeDataSourceToOutputDirectory(
      compiledDataSource,
      buildDir
    )
  }

  loadDataSource() {
    try {
      this._logStep(1, 'Load data source:', this.options.dataSourceFile)
      let data = yaml.safeLoad(fs.readFileSync(this.options.dataSourceFile, 'utf-8'))
      return immutable.fromJS(data)
    } catch (e) {
      console.error(chalk.red('Failed to load data source:'), e)
      process.exit(1)
    }
  }

  validateDataSource(definition) {
    this._logStep(2, 'Validate data source')
    // TODO
  }

  createBuildDirectory() {
    try {
      this._logStep(3, 'Create build directory')

      // Create temporary directory
      let buildDir = fs.mkdtempSync('.the-graph-wasm')

      // Ensure the temporary directory is destroyed on exit
      process.on('exit', () => fs.removeSync(buildDir))
      process.on('SIGINT', () => fs.removeSync(buildDir))
      process.on('uncaughtException', () => fs.removeSync(buildDir))

      return buildDir
    } catch (e) {
      console.error(chalk.red('Failed to create build directory:'), e)
      process.exit(1)
    }
  }

  copyDataSource(dataSource, buildDir) {
    try {
      this._logStep(4, 'Copy data source to build directory')

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
                  this._copyDataSourceFile(abiPath, this.sourceDir, buildDir)
                )
              )
            )
            .updateIn(['mapping', 'source', 'path'], mappingPath =>
              this._copyDataSourceFile(mappingPath, this.sourceDir, buildDir)
            )
        )
      })

      return dataSource
    } catch (e) {
      console.error(chalk.red('Failed to copy data source files:'), e)
      process.exit(1)
    }
  }

  _copyDataSourceFile(maybeRelativeFile, sourceDir, targetDir) {
    let absoluteSourceFile = path.resolve(sourceDir, maybeRelativeFile)
    let relativeSourceFile = path.relative(sourceDir, absoluteSourceFile)
    let targetFile = path.join(targetDir, relativeSourceFile)
    console.log(chalk.grey('Copy data source file:'), relativeSourceFile)
    fs.mkdirsSync(path.dirname(targetFile))
    fs.copyFileSync(absoluteSourceFile, targetFile)
    return targetFile
  }

  copyRuntimeFiles(buildDir) {
    this._logStep(5, 'Copy runtime to build directory')
    this._copyRuntimeFile(buildDir, 'index.ts')
  }

  _copyRuntimeFile(buildDir, basename) {
    console.log(chalk.grey('Copy runtime file:', basename))
    fs.copyFileSync(
      path.join(__dirname, '..', 'src', basename),
      path.join(buildDir, basename)
    )
  }

  mergeRuntimeAndMapping(buildDir) {
    this._logStep(6, 'Merge runtime and mapping')
    let mapping = fs.readFileSync(path.join(buildDir, 'mapping.ts'))
    fs.appendFileSync(path.join(buildDir, 'index.ts'), mapping, 'utf-8')
  }

  createOutputDirectory() {
    try {
      this._logStep(7, 'Create output directory:', this.options.outputDir)
      fs.mkdirsSync(this.options.outputDir)
    } catch (e) {
      console.error(chalk.red('Failed to create output directory:'), e)
      process.exit(1)
    }
  }

  compileDataSource(dataSource, buildDir) {
    try {
      this._logStep(8, 'Compile data source')

      dataSource = dataSource.updateIn(['datasets'], dataSets =>
        dataSets.map(dataSet =>
          dataSet.updateIn(['mapping', 'source', 'path'], mappingPath =>
            this._compileDataSetMapping(dataSet, mappingPath, buildDir)
          )
        )
      )

      return dataSource
    } catch (e) {
      console.error(chalk.red('Failed to compile data source:'), e)
      process.exit(1)
    }
  }

  _compileDataSetMapping(dataSet, mappingPath, buildDir) {
    try {
      let dataSetName = dataSet.getIn(['data', 'name'])

      console.log(
        chalk.gray('Compile data set mapping:'),
        dataSetName,
        '/',
        path.relative(buildDir, mappingPath)
      )

      let outputFile = `${dataSetName}.wast`

      asc.main(
        ['--baseDir', buildDir, '--outFile', outputFile, 'index.ts'],
        {
          stdout: process.stdout,
          stderr: process.stdout,
        },
        e => {
          if (e != null) {
            console.error(chalk.red('Failed to compile data set mapping:'), e)
            process.exit(1)
          }
        }
      )

      return path.join(buildDir, outputFile)
    } catch (e) {
      console.error(chalk.red('Failed to compile data set mapping:'), e)
      process.exit(1)
    }
  }

  writeDataSourceToOutputDirectory(dataSource, buildDir) {
    try {
      this._logStep(8, 'Write compiled data source to output directory')

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

      // Write the data source definition itself
      this._writeDataSourceDefinition(
        dataSource,
        path.join(this.options.outputDir, 'data-source.yaml')
      )

      return dataSource
    } catch (e) {
      console.error(
        chalk.red('Failed to write compiled data source to output directory:'),
        e
      )
      process.exit(1)
    }
  }

  _writeDataSourceDefinition(dataSource, filename) {
    try {
      console.info(chalk.grey('Write data source definition:'), path.basename(filename))
      fs.writeFileSync(filename, yaml.safeDump(dataSource.toJS(), { indent: 2 }))
    } catch (e) {
      console.error(chalk.red('Failed to write data source definition:'), e)
      process.exit(1)
    }
  }
}

module.exports = Compiler
