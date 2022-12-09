import { withSpinner, step } from './command-helpers/spinner'

const MIGRATIONS = [
  import('./migrations/mapping_api_version_0_0_1'),
  import('./migrations/mapping_api_version_0_0_2'),
  import('./migrations/mapping_api_version_0_0_3'),
  import('./migrations/mapping_api_version_0_0_4'),
  import('./migrations/mapping_api_version_0_0_5'),
  import('./migrations/spec_version_0_0_2'),
  import('./migrations/spec_version_0_0_3'),
]

const applyMigrations = async options =>
  await withSpinner(
    `Apply migrations`,
    `Failed to apply migrations`,
    `Warnings while applying migraitons`,
    async spinner => {
      await MIGRATIONS.reduce(async (previousPromise, migrationImport) => {
        await previousPromise
        const { default: migration } = await migrationImport
        let skipHint = await migration.predicate(options)
        if (typeof skipHint !== 'string' && skipHint) {
          step(spinner, 'Apply migration:', migration.name)
          await migration.apply(options)
        } else {
          if (typeof skipHint === 'string') {
            step(spinner, 'Skip migration:', `${migration.name} (${skipHint})`)
          } else {
            step(spinner, 'Skip migration:', `${migration.name}`)
          }
        }
      }, Promise.resolve())
    },
  )

export { applyMigrations }
