let chalk = require('chalk')
let chokidar = require('chokidar');
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

  getFilesToWatch() {
    try {
      let allFiles = []
      let subgraph = this.loadSubgraph()

      // Add all file paths specified in manifest
      subgraph.get('dataSources').map(dataSource => {
          dataSource.getIn(['mapping', 'abis']).map(abi => {
            allFiles.push(abi.get('file'))
          })
      })

      // Make paths absolute
      let allAbsolutePaths = allFiles.map(file => {
        return path.resolve(this.sourceDir, file)
      })
      return allAbsolutePaths
    } catch(e) {
      this.logger.fatal('Failed to parse subgraph file locations:', e)
    }
  }

  watchAndGenerateTypes() {
    let generator = this
    generator.logger.info('')

    // Initialize watcher
    let watcher = chokidar.watch(this.options.subgraphManifest, {
      persistent: true,
      ignoreInitial: true,
      atomic: 500
    })

    // Get locations of all files in subgraph manifest
    let fileLocations = this.getFilesToWatch()
    watcher.add(fileLocations)

    // Add event listeners
    watcher
      .on('ready', function() {
        compiler.logger.info(chalk.grey("Watching relevant manifest files"))
        generator.generateTypes()
      })
      .on('change', path => {
        generator.logger.info('%s %s',
          chalk.grey('File change detected: '),
          generator.displayPath(path)
        )
        if (path === generator.options.subgraphManifest) {
          // Update watcher based on changes to manifest
          let updatedWatchFiles = generator.getFilesToWatch()
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
            let addedFilesDisplay = addedFiles.map(file => {
              return compiler.displayPath(file)
            })
            compiler.logger.info(
              '%s %j',
              chalk.grey('Now watching: '),
              addedFilesDisplay
            )
          }
          if (removedFiles.length >= 1) {
            let addedFilesDisplay = removedFiles.map(file => {
              return compiler.displayPath(file)
            })
            compiler.logger.info(
              '%s %j',
              chalk.grey('No longer watching: '),
              addedFilesDisplay
            )
          }

        }
        generator.generateTypes()
      })

    // Catch keyboard interrupt: close watcher and exit process
    process.on('SIGINT', function() {
      watcher.close()
      process.exit()
    })
  }
}
