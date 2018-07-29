let fs = require('fs-extra')
let immutable = require('immutable')
let path = require('path')
let prettier = require('prettier')

let ABI = require('./abi')
let DataSource = require('./data-source')
let Logger = require('./logger')

module.exports = class TypeGenerator {
  constructor(options) {
    this.options = options || {}
    this.logger = new Logger(3, this.options.logger)
    this.displayPath = this.options.displayPath
      ? this.options.displayPath
      : s => path.relative(process.cwd(), s)
    this.sourceDir =
      this.options.sourceDir ||
      (this.options.dataSourceFile && path.dirname(this.options.dataSourceFile))
  }

  generateTypes() {
    let dataSource = this.loadDataSource()
    let abis = this.loadABIs(dataSource)
    return this.generateTypesForABIs(abis)
  }

  loadDataSource() {
    try {
      if (this.options.dataSourceFile) {
        this.logger.step(
          'Load data source:',
          this.displayPath(this.options.dataSourceFile)
        )
      } else {
        this.logger.step('Load data source')
      }

      return this.options.dataSource
        ? this.options.dataSource
        : DataSource.load(this.options.dataSourceFile)
    } catch (e) {
      this.logger.fatal('Failed to load data source:', e)
    }
  }

  loadABIs(dataSource) {
    try {
      this.logger.step('Load contract ABIs')
      return dataSource
        .get('datasets')
        .reduce(
          (abis, dataSet) =>
            dataSet
              .getIn(['mapping', 'abis'])
              .reduce(
                (abis, abi) =>
                  abis.push(
                    this._loadABI(dataSet, abi.get('name'), abi.getIn(['source', 'path']))
                  ),
                abis
              ),
          immutable.List()
        )
    } catch (e) {
      this.logger.fatal('Failed to load contract ABIs:', e)
    }
  }

  _loadABI(dataSet, name, maybeRelativePath) {
    try {
      if (this.sourceDir) {
        let absolutePath = path.resolve(this.sourceDir, maybeRelativePath)
        this.logger.note('Load contract ABI file:', this.displayPath(absolutePath))
        return { dataSet: dataSet, abi: ABI.load(name, absolutePath) }
      } else {
        return { dataSet: dataSet, abi: ABI.load(name, maybeRelativePath) }
      }
    } catch (e) {
      this.logger.fatal('Failed to load contract ABI:', e)
    }
  }

  generateTypesForABIs(abis) {
    try {
      this.logger.step('Generate types for contract ABIs')
      return abis.map((abi, name) => this._generateTypesForABI(abi))
    } catch (e) {
      this.logger.fatal('Failed to generate types for contract ABIS:', e)
    }
  }

  _generateTypesForABI(abi) {
    try {
      this.logger.note(
        'Generate types for contract ABI:',
        abi.abi.name,
        `(${path.basename(abi.abi.path)})`
      )

      let types = abi.abi.generateTypes()
      let typesCode = types.map(type => type.toString()).join('\n')
      let formattedCode = prettier.format(typesCode, { parser: 'typescript' })

      let outputFile = path.join(
        this.options.outputDir,
        abi.dataSet.getIn(['data', 'name']),
        `${abi.abi.name}.types.ts`
      )
      this.logger.note('Write types to:', this.displayPath(outputFile))
      fs.mkdirsSync(path.dirname(outputFile))
      fs.writeFileSync(outputFile, formattedCode)

      return { dataSet: abi.dataSet, abi: abi.abi, outputFile: outputFile }
    } catch (e) {
      this.logger.fatal('Failed to generate types for contract ABI:', e.stack)
    }
  }
}
