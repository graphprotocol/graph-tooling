import chokidar from 'chokidar'
import path from 'path'

export default class Watcher {
  private onReady: () => void
  private onTrigger: (arg: any) => void
  private onCollectFiles: () => Promise<string[]>
  private onError: (error: Error) => void
  private watcher: chokidar.FSWatcher | undefined

  constructor(options: {
    onReady: () => void
    onTrigger: (arg: any) => void
    onCollectFiles: () => Promise<string[]>
    onError: (error: Error) => void
  }) {
    const { onReady, onTrigger, onCollectFiles, onError } = options
    this.onReady = onReady
    this.onTrigger = onTrigger
    this.onCollectFiles = onCollectFiles
    this.onError = onError
  }

  async watch() {
    // Collect files to watch
    let files = await this.onCollectFiles()

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

    watcher.on('error', (error: any) => {
      onError(error)
    })

    watcher.on('all', async (_: any, file: any) => {
      try {
        // Collect watch all new files to watch
        let newFiles = await onCollectFiles()

        // Collect watched files, if there are any
        let watchedFiles = []

        let watched = watcher.getWatched()
        watchedFiles = Object.keys(watched).reduce(
          (files: string[], dirname: string) =>
            watched[dirname].reduce((files: string[], filename: string) => {
              files.push(path.resolve(path.join(dirname, filename)))
              return files
            }, files),
          [],
        )

        let diff = (xs: any[], ys: any[]) => ({
          added: ys.filter((y: any) => xs.indexOf(y) < 0),
          removed: xs.filter((x: any) => ys.indexOf(x) < 0),
        })

        // Diff previously watched files and new files; then remove and
        // add files from/to the watcher accordingly
        let filesDiff = diff(watchedFiles, newFiles)
        watcher.unwatch(filesDiff.removed)
        watcher.add(filesDiff.added)

        // Run the trigger callback
        await onTrigger(file)
      } catch (e) {
        onError(e)
      }
    })
  }

  close() {
    if (this.watcher !== undefined) {
      this.watcher.close()
    }
  }
}
