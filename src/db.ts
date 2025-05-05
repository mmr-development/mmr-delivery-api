import { Kysely, PostgresDialect } from 'kysely';
import { Database } from './database';
import { Pool } from 'pg';
import { config } from './config';

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool((config.database)),
  }),
});
