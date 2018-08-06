let fs = require('fs-extra')
let immutable = require('immutable')
let path = require('path')
let prettier = require('prettier')

let ABI = require('./abi')
let Logger = require('./logger')
let Subgraph = require('./subgraph')

module.exports = class TypeGenerator {
  constructor(options) {
    this.options = options || {}
    this.logger = new Logger(3, { verbosity: this.options.verbosity })
    this.displayPath = this.options.displayPath
      ? this.options.displayPath
      : s => path.relative(process.cwd(), s)
    this.sourceDir =
      this.options.sourceDir ||
      (this.options.subgraphManifest && path.dirname(this.options.subgraphManifest))
  }

  generateTypes() {
    let subgraph = this.loadSubgraph()
    let abis = this.loadABIs(subgraph)
    return this.generateTypesForABIs(abis)
  }

  loadSubgraph() {
    try {
      if (this.options.subgraphManifest) {
        this.logger.step(
          'Load subgraph:',
          this.displayPath(this.options.subgraphManifest)
        )
      } else {
        this.logger.step('Load subgraph')
      }

      return this.options.subgraph
        ? this.options.subgraph
        : Subgraph.load(this.options.subgraphManifest)
    } catch (e) {
      this.logger.fatal('Failed to load subgraph:', e)
    }
  }

  loadABIs(subgraph) {
    try {
      this.logger.step('Load contract ABIs')
      return subgraph
        .get('dataSources')
        .reduce(
          (abis, dataSource) =>
            dataSource
              .getIn(['mapping', 'abis'])
              .reduce(
                (abis, abi) =>
                  abis.push(this._loadABI(dataSource, abi.get('name'), abi.get('file'))),
                abis
              ),
          immutable.List()
        )
    } catch (e) {
      this.logger.fatal('Failed to load contract ABIs:', e)
    }
  }

  _loadABI(dataSource, name, maybeRelativePath) {
    try {
      if (this.sourceDir) {
        let absolutePath = path.resolve(this.sourceDir, maybeRelativePath)
        this.logger.note('Load contract ABI file:', this.displayPath(absolutePath))
        return { dataSource: dataSource, abi: ABI.load(name, absolutePath) }
      } else {
        return { dataSource: dataSource, abi: ABI.load(name, maybeRelativePath) }
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
        `(${path.basename(abi.abi.file)})`
      )

      let types = abi.abi.generateTypes()
      let typesCode = types.map(type => type.toString()).join('\n')
      let formattedCode = prettier.format(typesCode, { parser: 'typescript' })

      let outputFile = path.join(
        this.options.outputDir,
        abi.dataSource.get('name'),
        `${abi.abi.name}.types.ts`
      )
      this.logger.note('Write types to:', this.displayPath(outputFile))
      fs.mkdirsSync(path.dirname(outputFile))
      fs.writeFileSync(outputFile, formattedCode)

      return { dataSource: abi.dataSource, abi: abi.abi, outputFile: outputFile }
    } catch (e) {
      this.logger.fatal('Failed to generate types for contract ABI:', e.stack)
    }
  }
}
