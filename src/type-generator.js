const fs = require('fs-extra')
const immutable = require('immutable')
const path = require('path')
const prettier = require('prettier')
const graphql = require('graphql/language')
const chalk = require('chalk')
const toolbox = require('gluegun/toolbox')

const Schema = require('./schema')
const Subgraph = require('./subgraph')
const Uncrashable = require('./uncrashable')

const DataSourceTemplateCodeGenerator = require('./codegen/template')
const Watcher = require('./watcher')
const { step, withSpinner } = require('./command-helpers/spinner')
const { applyMigrations } = require('./migrations')
const { GENERATED_FILE_NOTE } = require('./codegen/typescript')
const { displayPath } = require('./command-helpers/fs')
const {
  generateUncrashableEntities,
} = require('./command-helpers/uncrashable/Index.bs.js')

module.exports = class TypeGenerator {
  constructor(options) {
    this.options = options || {}
    this.sourceDir =
      this.options.sourceDir ||
      (this.options.subgraphManifest && path.dirname(this.options.subgraphManifest))

    this.protocol = this.options.protocol
    this.protocolTypeGenerator = this.protocol.getTypeGenerator({
      sourceDir: this.sourceDir,
      outputDir: this.options.outputDir,
    })

    process.on('uncaughtException', function(e) {
      toolbox.print.error(`UNCAUGHT EXCEPTION: ${e}`)
    })
  }

  async generateTypes() {
    try {
      if (!this.options.skipMigrations && this.options.subgraphManifest) {
        await applyMigrations({
          sourceDir: this.sourceDir,
          manifestFile: this.options.subgraphManifest,
        })
      }
      let subgraph = await this.loadSubgraph()

      // Not all protocols support/have ABIs.
      if (this.protocol.hasABIs()) {
        const abis = await this.protocolTypeGenerator.loadABIs(subgraph)
        await this.protocolTypeGenerator.generateTypesForABIs(abis)
      }

      await this.generateTypesForDataSourceTemplates(subgraph)

      // Not all protocols support/have ABIs.
      if (this.protocol.hasABIs()) {
        const templateAbis = await this.protocolTypeGenerator.loadDataSourceTemplateABIs(
          subgraph,
        )
        await this.protocolTypeGenerator.generateTypesForDataSourceTemplateABIs(
          templateAbis,
        )
      }

      let schema = await this.loadSchema(subgraph)
      await this.generateTypesForSchema(schema)

      toolbox.print.success('\nTypes generated successfully\n')

      if (this.options.uncrashable && this.options.uncrashableConfig) {
        let safeMode = this.options.safeMode !== undefined ? this.options.safeMode : false
        let uncrashableEntities = await this.loadUncrashableConfig(schema)
        await this.generateUncrashableEntities(uncrashableEntities, schema, safeMode)
        toolbox.print.success('\nUncrashable Helpers generated successfully\n')
      }
      return true
    } catch (e) {
      return false
    }
  }

  async loadUncrashableConfig(schema, { quiet } = { quiet: false }) {
    const uncrashableLoadOptions = { graphSchema: schema, skipValidation: false }
    if (quiet) {
      return this.options.uncrashableEntities
        ? this.options.uncrashableEntities
        : Uncrashable.load(this.options.uncrashableConfig, uncrashableLoadOptions).result
    } else {
      const uncrashableConfigPath = displayPath(this.options.uncrashableConfig)

      return await withSpinner(
        `Load uncrashable config from ${uncrashableConfigPath}`,
        `Failed to load uncrashable config from ${uncrashableConfigPath}`,
        `Warnings while loading uncrashable config from ${uncrashableConfigPath}`,
        async spinner => {
          return this.options.uncrashableEntities
            ? this.options.uncrashableEntities
            : Uncrashable.load(this.options.uncrashableConfig, uncrashableLoadOptions)
        },
      )
    }
  }

  async generateUncrashableEntities(uncrashableEntities, graphSchema, safeMode) {
    let ast = graphql.parse(graphSchema.document)
    let entityDefinitions = ast['definitions']
    return await withSpinner(
      `Generate Uncrashable Entity Helpers`,
      `Failed to generate Uncrashable Entity Helpers`,
      `Warnings while generating Uncrashable Entity Helpers`,
      async spinner => {
        let code = generateUncrashableEntities(
          entityDefinitions,
          uncrashableEntities,
          safeMode,
        )
        let outputFile = path.join(this.options.outputDir, 'UncrashableEntityHelpers.ts')
        step(spinner, 'Write types to', displayPath(outputFile))
        await fs.mkdirs(path.dirname(outputFile))
        await fs.writeFile(outputFile, code)
      },
    )
  }

  async loadSubgraph({ quiet } = { quiet: false }) {
    const subgraphLoadOptions = { protocol: this.protocol, skipValidation: false }

    if (quiet) {
      return this.options.subgraph
        ? this.options.subgraph
        : Subgraph.load(this.options.subgraphManifest, subgraphLoadOptions).result
    } else {
      const manifestPath = displayPath(this.options.subgraphManifest)

      return await withSpinner(
        `Load subgraph from ${manifestPath}`,
        `Failed to load subgraph from ${manifestPath}`,
        `Warnings while loading subgraph from ${manifestPath}`,
        async spinner => {
          return this.options.subgraph
            ? this.options.subgraph
            : Subgraph.load(this.options.subgraphManifest, subgraphLoadOptions)
        },
      )
    }
  }

  async loadSchema(subgraph) {
    let maybeRelativePath = subgraph.getIn(['schema', 'file'])
    let absolutePath = path.resolve(this.sourceDir, maybeRelativePath)
    return await withSpinner(
      `Load GraphQL schema from ${displayPath(absolutePath)}`,
      `Failed to load GraphQL schema from ${displayPath(absolutePath)}`,
      `Warnings while loading GraphQL schema from ${displayPath(absolutePath)}`,
      async spinner => {
        let maybeRelativePath = subgraph.getIn(['schema', 'file'])
        let absolutePath = path.resolve(this.sourceDir, maybeRelativePath)
        return Schema.load(absolutePath)
      },
    )
  }

  async generateTypesForSchema(schema) {
    return await withSpinner(
      `Generate types for GraphQL schema`,
      `Failed to generate types for GraphQL schema`,
      `Warnings while generating types for GraphQL schema`,
      async spinner => {
        // Generate TypeScript module from schema
        let codeGenerator = schema.codeGenerator()
        let code = prettier.format(
          [
            GENERATED_FILE_NOTE,
            ...codeGenerator.generateModuleImports(),
            ...codeGenerator.generateTypes(),
          ].join('\n'),
          {
            parser: 'typescript',
          },
        )

        let outputFile = path.join(this.options.outputDir, 'schema.ts')
        step(spinner, 'Write types to', displayPath(outputFile))
        await fs.mkdirs(path.dirname(outputFile))
        await fs.writeFile(outputFile, code)
      },
    )
  }

  async generateTypesForDataSourceTemplates(subgraph) {
    return await withSpinner(
      `Generate types for data source templates`,
      `Failed to generate types for data source templates`,
      `Warnings while generating types for data source templates`,
      async spinner => {
        // Combine the generated code for all templates
        let codeSegments = subgraph
          .get('templates', immutable.List())
          .reduce((codeSegments, template) => {
            step(
              spinner,
              'Generate types for data source template',
              `${template.get('name')}`,
            )

            let codeGenerator = new DataSourceTemplateCodeGenerator(
              template,
              this.protocol,
            )

            // Only generate module imports once, because they are identical for
            // all types generated for data source templates.
            if (codeSegments.isEmpty()) {
              codeSegments = codeSegments.concat(codeGenerator.generateModuleImports())
            }

            return codeSegments.concat(codeGenerator.generateTypes())
          }, immutable.List())

        if (!codeSegments.isEmpty()) {
          let code = prettier.format([GENERATED_FILE_NOTE, ...codeSegments].join('\n'), {
            parser: 'typescript',
          })

          let outputFile = path.join(this.options.outputDir, 'templates.ts')
          step(spinner, `Write types for templates to`, displayPath(outputFile))
          await fs.mkdirs(path.dirname(outputFile))
          await fs.writeFile(outputFile, code)
        }
      },
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
          spinner.info(`File change detected: ${displayPath(changedFile)}\n`)
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
