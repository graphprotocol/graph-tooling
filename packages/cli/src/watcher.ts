import path from 'path';
import chokidar from 'chokidar';

export default class Watcher {
  private onReady: () => void;
  private onTrigger: (arg: any) => void;
  private onCollectFiles: () => Promise<string[]>;
  private onError: (error: Error) => void;
  private watcher: chokidar.FSWatcher | undefined;

  constructor(options: {
    onReady: () => void;
    onTrigger: (arg: any) => void;
    onCollectFiles: () => Promise<string[]>;
    onError: (error: Error) => void;
  }) {
    const { onReady, onTrigger, onCollectFiles, onError } = options;
    this.onReady = onReady;
    this.onTrigger = onTrigger;
    this.onCollectFiles = onCollectFiles;
    this.onError = onError;
  }

  async watch() {
    // Collect files to watch
    const files = await this.onCollectFiles();

    // Initialize watcher
    this.watcher = chokidar.watch(files, {
      persistent: true,
      ignoreInitial: true,
      atomic: 500,
    });

    // Bind variables locally
    const watcher = this.watcher;
    const onTrigger = this.onTrigger;
    const onCollectFiles = this.onCollectFiles;
    const onError = this.onError;
    const onReady = this.onReady;

    watcher.on('ready', async () => {
      // Notify listeners that we're watching
      onReady();

      // Trigger once when ready
      await onTrigger(undefined);
    });

    watcher.on('error', (error: any) => {
      onError(error);
    });

    watcher.on('all', async (_: any, file: any) => {
      try {
        // Collect watch all new files to watch
        const newFiles = await onCollectFiles();

        // Collect watched files, if there are any
        let watchedFiles = [];

        const watched = watcher.getWatched();
        watchedFiles = Object.keys(watched).reduce(
          (files: string[], dirname: string) =>
            watched[dirname].reduce((files: string[], filename: string) => {
              files.push(path.resolve(path.join(dirname, filename)));
              return files;
            }, files),
          [],
        );

        const diff = (xs: any[], ys: any[]) => ({
          added: ys.filter((y: any) => !xs.includes(y)),
          removed: xs.filter((x: any) => !ys.includes(x)),
        });

        // Diff previously watched files and new files; then remove and
        // add files from/to the watcher accordingly
        const filesDiff = diff(watchedFiles, newFiles);
        watcher.unwatch(filesDiff.removed);
        watcher.add(filesDiff.added);

        // Run the trigger callback
        await onTrigger(file);
      } catch (e) {
        onError(e);
      }
    });
  }

  close() {
    if (this.watcher !== undefined) {
      this.watcher.close();
    }
  }
}
