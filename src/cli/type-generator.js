let chalk = require('chalk')
let chokidar = require('chokidar');
let cluster = require('cluster')
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
    this.logger = new Logger(3, {verbosity: this.options.verbosity})
    this.displayPath = this.options.displayPath
      ? this.options.displayPath
      : s => path.relative(process.cwd(), s)
    this.sourceDir =
      this.options.sourceDir ||
      (this.options.subgraphManifest && path.dirname(this.options.subgraphManifest))
  }

  generateTypes() {
    this.logger.currentStep = 0
    if (this.options.subgraphManifest) {
      this.logger.step(
        'Load subgraph:',
        this.displayPath(this.options.subgraphManifest)
      )
    } else {
      this.logger.step('Load subgraph')
    }

    try {
      let subgraph = this.loadSubgraph()
      let abis = this.loadABIs(subgraph)
      return this.generateTypesForABIs(abis)
    } catch(e) {
      if (e instanceof Error) {
        if(e.hasOwnProperty('message')) {
          this.logger.fatal(e.message)
        } else {
          this.logger.fatal(e)
        }
        if(e.hasOwnProperty('stack')) {
          this.logger.note(e.stack.split('\n').slice(1).join('\n'))
        }
      } else {
        this.logger.fatal("Failed to generate types", e)
      }
    }
  }

  loadSubgraph() {
    try {
      return this.options.subgraph
        ? this.options.subgraph
        : Subgraph.load(this.options.subgraphManifest)
    } catch (e) {
      throw Error('Failed to load subgraph')
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
      throw Error('Failed to load contract ABIs')
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
      throw Error('Failed to load contract ABI')
    }
  }

  generateTypesForABIs(abis) {
    try {
      this.logger.step('Generate types for contract ABIs')
      return abis.map((abi, name) => this._generateTypesForABI(abi))
    } catch (e) {
      throw Error('Failed to load subgraph')
    } finally {
      this.logger.info('')
      this.logger.info(chalk.magenta('Types generated'))
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
      throw Error('Failed to generate types for contract ABI')
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
    } catch (e) {
      throw Error('Failed to parse subgraph file locations')
    }
  }

  watchAndGenerateTypes() {
    let generator = this

    let watchedFiles = this.getFilesToWatch()
    generator.generateTypes()
    // Initialize watcher that reruns generator
    let watcher = chokidar.watch(this.options.subgraphManifest, {
      persistent: true,
      ignoreInitial: true,
      atomic: 500
    })
    watcher
      .on('ready', function () {
        generator.logger.info('')
        generator.logger.info(chalk.grey('Watching relevant manifest files'))
      })
      .on('change', changedFile => {
        generator.logger.info('')
        generator.logger.info('%s %s',
          chalk.grey('File change detected: '),
          generator.displayPath(changedFile)
        )

        // Convert to absolute paths for comparison
        let manifestAbsolute =
          (path.resolve(generator.options.subgraphManifest) === path.normalize(generator.options.subgraphManifest))
          ? this.options.subgraphManifest
          : path.resolve(generator.sourceDir, generator.options.subgraphManifest)
        let changedFileAbsolute = (path.resolve(changedFile) === path.normalize(changedFile))
          ? changedFile
          : path.resolve(generator.sourceDir, changedFile)

        if (changedFileAbsolute === manifestAbsolute) {
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
            generator.logger.note(
              'Now watching: ',
              addedFiles.map(file => generator.displayPath(file)).join(', ')
            )
          }
          if (removedFiles.length >= 1) {
            generator.logger.note(
              'No longer watching: ',
              removedFiles.map(file => generator.displayPath(file)).join(', ')
            )
          }
        }
        generator.generateTypes()
      })
      .on('error', error =>
        this.logger.info('Watcher error: ', error)
      )
    watcher.add(watchedFiles)

    // Catch keyboard interrupt: close watcher and exit process
    process.on('SIGINT', () => {
      watcher.close()
      process.exit()
    })
    process.on('uncaughtException', function (err) {
      generator.logger.fatal('UNCAUGHT EXCEPTION: ', err)
    })
  }
}