import { step, withSpinner } from './command-helpers/spinner.js';

const MIGRATIONS = [
  import('./migrations/mapping_api_version_0_0_1.js'),
  import('./migrations/mapping_api_version_0_0_2.js'),
  import('./migrations/mapping_api_version_0_0_3.js'),
  import('./migrations/mapping_api_version_0_0_4.js'),
  import('./migrations/mapping_api_version_0_0_5.js'),
  import('./migrations/spec_version_0_0_2.js'),
  import('./migrations/spec_version_0_0_3.js'),
];

export const applyMigrations = async (options: { sourceDir: string; manifestFile: string }) =>
  await withSpinner(
    `Apply migrations`,
    `Failed to apply migrations`,
    `Warnings while applying migraitons`,
    async spinner => {
      await MIGRATIONS.reduce(async (previousPromise, migrationImport) => {
        await previousPromise;
        const { default: migration } = await migrationImport;
        const skipHint = await migration.predicate(options);
        if (typeof skipHint !== 'string' && skipHint) {
          step(spinner, 'Apply migration:', migration.name);
          await migration.apply(options);
        } else if (typeof skipHint === 'string') {
          step(spinner, 'Skip migration:', `${migration.name} (${skipHint})`);
        } else {
          step(spinner, 'Skip migration:', String(migration.name));
        }
      }, Promise.resolve());
    },
  );
