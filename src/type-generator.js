let fs = require('fs-extra')
let immutable = require('immutable')
let path = require('path')
let prettier = require('prettier')
let graphql = require('graphql/language')

let ABI = require('./abi')
let Logger = require('./logger')
let Schema = require('./schema')
let Subgraph = require('./subgraph')
let Watcher = require('./watcher')

module.exports = class TypeGenerator {
  constructor(options) {
    this.options = options || {}
    this.logger = new Logger(3, {
      prefix: this.options.logger.prefix,
      verbosity: this.options.logger.verbosity,
    })
    this.displayPath = this.options.displayPath
      ? this.options.displayPath
      : s => path.relative(process.cwd(), s)
    this.sourceDir =
      this.options.sourceDir ||
      (this.options.subgraphManifest && path.dirname(this.options.subgraphManifest))

    process.on('uncaughtException', function(e) {
      this.logger.error('UNCAUGHT EXCEPTION:', e)
    })
  }

  generateTypes() {
    this.logger.currentStep = 0
    if (this.options.subgraphManifest) {
      this.logger.step('Load subgraph:', this.displayPath(this.options.subgraphManifest))
    } else {
      this.logger.step('Load subgraph')
    }

    try {
      let subgraph = this.loadSubgraph()

      let abis = this.loadABIs(subgraph)
      this.generateTypesForABIs(abis)

      //let schema = this.loadSchema(subgraph)
      //this.generateTypesForSchema(schema)
    } catch (e) {
      this.logger.error('Failed to generate types:', e)
    }
  }

  loadSubgraph() {
    try {
      return this.options.subgraph
        ? this.options.subgraph
        : Subgraph.load(this.options.subgraphManifest)
    } catch (e) {
      throw Error(`Failed to load subgraph: ${e.message}`)
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
      throw Error(`Failed to load contract ABIs: ${e}`)
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
      throw Error(`Failed to load contract ABI: ${e}`)
    }
  }

  generateTypesForABIs(abis) {
    try {
      this.logger.step('Generate types for contract ABIs')
      return abis.map((abi, name) => this._generateTypesForABI(abi))
    } catch (e) {
      throw Error(`Failed to generate types for contract ABIs: ${e}`)
    } finally {
      this.logger.status('Types generated')
    }
  }

  _generateTypesForABI(abi) {
    try {
      this.logger.note(
        'Generate types for contract ABI:',
        abi.abi.name,
        `(${path.basename(abi.abi.file)})`
      )

      let codeGenerator = abi.abi.codeGenerator()
      let code = prettier.format(
        [...codeGenerator.generateModuleImports(), ...codeGenerator.generateTypes()].join(
          '\n'
        ),
        {
          parser: 'typescript',
        }
      )

      let outputFile = path.join(
        this.options.outputDir,
        abi.dataSource.get('name'),
        `${abi.abi.name}.ts`
      )
      this.logger.note('Write types to:', this.displayPath(outputFile))
      fs.mkdirsSync(path.dirname(outputFile))
      fs.writeFileSync(outputFile, code)
    } catch (e) {
      throw Error(`Failed to generate types for contract ABI: ${e}`)
    }
  }

  loadSchema(subgraph) {
    try {
      this.logger.step('Load GraphQL schema')
      let filename = subgraph.getIn(['schema', 'file'])
      return Schema.load(filename)
    } catch (e) {
      throw Error(`Failed to load GraphQL schema: ${e}`)
    }
  }

  generateTypesForSchema(schema) {
    try {
      this.logger.step('Generate types for GraphQL schema')

      // Generate TypeScript code module from schema
      let code = prettier.format(
        [...schema.generateModuleImports(), ...schema.generateTypes()].join('\n'),
        {
          parser: 'typescript',
        }
      )

      let outputFile = path.join(this.options.outputDir, 'schema.ts')
      this.logger.note('Write types to:', this.displayPath(outputFile))
      fs.mkdirsSync(path.dirname(outputFile))
      fs.writeFileSync(outputFile, code)
    } catch (e) {
      throw Error(`Failed to generate types for GraphQL schema: ${e}`)
    }
  }

  getFilesToWatch() {
    try {
      let files = []
      let subgraph = this.loadSubgraph()

      // Add the subgraph manifest file
      files.push(this.options.subgraphManifest)

      // Add all file paths specified in manifest
      subgraph.get('dataSources').map(dataSource => {
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

  watchAndGenerateTypes() {
    let generator = this

    // Create watcher and generate types once and then on every change to a watched file
    let watcher = new Watcher({
      onReady: () => generator.logger.status('Watching subgraph files'),
      onTrigger: async changedFile => {
        if (changedFile !== undefined) {
          generator.logger.status('File change detected:', this.displayPath(changedFile))
        }
        await generator.generateTypes()
      },
      onCollectFiles: () => generator.getFilesToWatch(),
      onError: error => generator.logger.error('Error:', error),
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
}
