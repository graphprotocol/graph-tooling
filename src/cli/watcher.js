const chokidar = require('chokidar')
const path = require('path')

module.exports = class Watcher {
  constructor(options) {
    const { onReady, onTrigger, onCollectFiles, onError, onFilesUpdated } = options
    this.onReady = onReady
    this.onTrigger = onTrigger
    this.onCollectFiles = onCollectFiles
    this.onError = onError
  }

  watch() {
    // Collect files to watch
    let files = this.onCollectFiles()

    // Initialize watcher
    this.watcher = chokidar.watch(files, {
      persistent: true,
      ignoreInitial: true,
      atomic: 500,
    })

    // Bind variables locally
    let watcher = this.watcher
    let onTrigger = this.onTrigger
    let onCollectFiles = this.onCollectFiles
    let onError = this.onError
    let onReady = this.onReady

    watcher.on('ready', async () => {
      // Notify listeners that we're watching
      onReady()

      // Trigger once when ready
      await onTrigger(undefined)
    })

    watcher.on('error', error => {
      onError(error)
    })

    watcher.on('all', async (eventType, file) => {
      try {
        // Unwatch all previous files
        let watched = watcher.getWatched()
        let files = Object.keys(watched).reduce(
          (files, dirname) =>
            watched[dirname].reduce((files, filename) => {
              files.push(path.resolve(path.join(dirname, filename)))
              return files
            }, files),
          []
        )
        watcher.unwatch(files)
      } catch (e) {
        onError(e)
      }

      // Collect and watch all new files to watch
      let files = onCollectFiles()
      watcher.add(files)

      // Run the trigger callback
      await onTrigger(file)
    })
  }

  close() {
    if (this.watcher !== undefined) {
      this.watcher.close()
    }
  }
}
