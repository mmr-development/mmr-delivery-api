import * as path from 'path';
import { Pool } from 'pg';
import { promises as fs } from 'fs';
import {
  Kysely,
  Migrator,
  PostgresDialect,
  FileMigrationProvider,
} from 'kysely';
import { Database } from '../src/types/kysely.types';
import config from '../src/config';

async function migrateDown() {
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        host: config.database.host,
        database: config.database.database,
        user: config.database.user,
        password: config.database.password,
        port: 5432,
      }),
    }),
  })

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      // This needs to be an absolute path.
      migrationFolder: path.join(__dirname, '../migrations'),
    }),
  })

  const { error, results } = await migrator.migrateDown()

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`migration "${it.migrationName}" was reverted successfully`)
    } else if (it.status === 'Error') {
      console.error(`failed to revert migration "${it.migrationName}"`)
    }
  })

  if (error) {
    console.error('failed to migrate down')
    console.error(error)
    process.exit(1)
  }

  await db.destroy()
}

migrateDown()