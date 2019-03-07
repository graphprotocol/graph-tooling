const fs = require('fs-extra')
const immutable = require('immutable')
const path = require('path')
const prettier = require('prettier')
const graphql = require('graphql/language')
const chalk = require('chalk')
const toolbox = require('gluegun/toolbox')

const ABI = require('./abi')
const Schema = require('./schema')
const Subgraph = require('./subgraph')
const Watcher = require('./watcher')
const { step, withSpinner } = require('./command-helpers/spinner')

module.exports = class TypeGenerator {
  constructor(options) {
    this.options = options || {}
    this.sourceDir =
      this.options.sourceDir ||
      (this.options.subgraphManifest && path.dirname(this.options.subgraphManifest))

    process.on('uncaughtException', function(e) {
      toolbox.print.error(`UNCAUGHT EXCEPTION: ${e}`)
    })
  }

  displayPath(p) {
    return path.relative(process.cwd(), p)
  }

  async generateTypes() {
    try {
      let subgraph = await this.loadSubgraph()
      let abis = await this.loadABIs(subgraph)
      await this.generateTypesForABIs(abis)
      let schema = await this.loadSchema(subgraph)
      await this.generateTypesForSchema(schema)
      toolbox.print.success('\nTypes generated successfully\n')
      return true
    } catch (e) {
      return false
    }
  }

  async loadSubgraph({ quiet } = { quiet: false }) {
    if (quiet) {
      return this.options.subgraph
        ? this.options.subgraph
        : Subgraph.load(this.options.subgraphManifest)
    } else {
      return await withSpinner(
        `Load subgraph from ${this.displayPath(this.options.subgraphManifest)}`,
        `Failed to load subgraph from ${this.displayPath(this.options.subgraphManifest)}`,
        `Loaded subgraph from ${this.displayPath(this.options.subgraphManifest)} with warnings`,
        async spinner => {
          try {
            return this.options.subgraph
              ? this.options.subgraph
              : Subgraph.load(this.options.subgraphManifest)
          } catch (e) {
            throw Error(`Failed to load subgraph: ${e.message}`)
          }
        }
      )
    }
  }

  async loadABIs(subgraph) {
    return await withSpinner(
      'Load contract ABIs',
      'Failed to load contract ABIs',
      null,
      async spinner => {
        try {
          return subgraph
            .get('dataSources')
            .reduce(
              (abis, dataSource) =>
                dataSource
                  .getIn(['mapping', 'abis'])
                  .reduce(
                    (abis, abi) =>
                      abis.push(
                        this._loadABI(
                          dataSource,
                          abi.get('name'),
                          abi.get('file'),
                          spinner
                        )
                      ),
                    abis
                  ),
              immutable.List()
            )
        } catch (e) {
          throw Error(`Failed to load contract ABIs: ${e.message}`)
        }
      }
    )
  }

  _loadABI(dataSource, name, maybeRelativePath, spinner) {
    try {
      if (this.sourceDir) {
        let absolutePath = path.resolve(this.sourceDir, maybeRelativePath)
        step(spinner, `Load contract ABI from`, this.displayPath(absolutePath))
        return { dataSource: dataSource, abi: ABI.load(name, absolutePath) }
      } else {
        return { dataSource: dataSource, abi: ABI.load(name, maybeRelativePath) }
      }
    } catch (e) {
      throw Error(`Failed to load contract ABI: ${e.message}`)
    }
  }

  generateTypesForABIs(abis) {
    return withSpinner(
      `Generate types for contract ABIs`,
      `Failed to generate types for contract ABIs`,
      null,
      async spinner => {
        return await abis.map(
          async (abi, name) => await this._generateTypesForABI(abi, spinner)
        )
      }
    )
  }

  async _generateTypesForABI(abi, spinner) {
    try {
      step(
        spinner,
        `Generate types for contract ABI:`,
        `${abi.abi.name} (${this.displayPath(abi.abi.file)})`
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
      step(spinner, `Write types to`, this.displayPath(outputFile))
      fs.mkdirsSync(path.dirname(outputFile))
      fs.writeFileSync(outputFile, code)
    } catch (e) {
      throw Error(`Failed to generate types for contract ABI: ${e.message}`)
    }
  }

  async loadSchema(subgraph) {
    let maybeRelativePath = subgraph.getIn(['schema', 'file'])
    let absolutePath = path.resolve(this.sourceDir, maybeRelativePath)
    return await withSpinner(
      `Load GraphQL schema from ${this.displayPath(absolutePath)}`,
      `Failed to load GraphQL schema from ${this.displayPath(absolutePath)}`,
      null,
      async spinner => {
        let maybeRelativePath = subgraph.getIn(['schema', 'file'])
        let absolutePath = path.resolve(this.sourceDir, maybeRelativePath)
        return Schema.load(absolutePath)
      }
    )
  }

  async generateTypesForSchema(schema) {
    return await withSpinner(
      `Generate types for GraphQL schema`,
      `Failed to generate types for GraphQL schema`,
      null,
      async spinner => {
        // Generate TypeScript module from schema
        let codeGenerator = schema.codeGenerator()
        let code = prettier.format(
          [
            ...codeGenerator.generateModuleImports(),
            ...codeGenerator.generateTypes(),
          ].join('\n'),
          {
            parser: 'typescript',
          }
        )

        let outputFile = path.join(this.options.outputDir, 'schema.ts')
        step(spinner, 'Write types to', this.displayPath(outputFile))
        fs.mkdirsSync(path.dirname(outputFile))
        fs.writeFileSync(outputFile, code)
      }
    )
  }

  async getFilesToWatch() {
    try {
      let files = []
      let subgraph = await this.loadSubgraph({ quiet: true })

      // Add the subgraph manifest file
      files.push(this.options.subgraphManifest)

      // Add the GraphQL schema to the watched files
      files.push(subgraph.getIn(['schema', 'file']))

      // Add all file paths specified in manifest
      subgraph.get('dataSources').map(dataSource => {
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

  async watchAndGenerateTypes() {
    let generator = this
    let spinner

    // Create watcher and generate types once and then on every change to a watched file
    let watcher = new Watcher({
      onReady: () => (spinner = toolbox.print.spin('Watching subgraph files')),
      onTrigger: async changedFile => {
        if (changedFile !== undefined) {
          spinner.info(`File change detected: ${this.displayPath(changedFile)}\n`)
        }
        await generator.generateTypes()
        spinner.start()
      },
      onCollectFiles: async () => await generator.getFilesToWatch(),
      onError: error => {
        spinner.stop()
        toolbox.print.error(`${error}\n`)
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
}
