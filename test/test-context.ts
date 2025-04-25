import * as path from 'path';
import axios from 'axios';
import { promises as fs } from 'fs';
import {
  FileMigrationProvider,
  Kysely,
  Migrator,
  PostgresDialect,
  sql,
} from 'kysely';
import { Pool } from 'pg';
import { testConfig } from './test-config';
import { Database } from '../src/database';
import { buildApp } from '../src/app';
import Fastify, { FastifyInstance } from 'fastify';

let db: Kysely<Database>;
let server: FastifyInstance;

// Create axios instance for testing API calls
const request = axios.create({
  baseURL: `http://localhost:${testConfig.port}`,
  validateStatus: () => true,
})

export async function before(): Promise<void> {
  const adminDb = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool(testConfig.adminDatabase),
    }),
  })

  const { database } = testConfig.database
  await sql`DROP DATABASE IF EXISTS ${sql.id(database!)}`.execute(adminDb)
  await sql`CREATE DATABASE ${sql.id(database!)}`.execute(adminDb)
  await adminDb.destroy()

  const db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool(testConfig.database),
    }),
  })

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, '../migrations'),
    }),
  })

  await migrator.migrateToLatest()
  await db.destroy()
}

export async function after(): Promise<void> {

}

export async function beforeEach(): Promise<void> {
  server = Fastify();
  server.register(buildApp, { config: testConfig });
}

export async function afterEach(): Promise<void> {
  await server.close()
}

export { request, db, server }
