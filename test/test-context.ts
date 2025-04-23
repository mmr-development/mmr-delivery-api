import * as path from 'path';
import axios from 'axios';
import { promises as fs } from 'fs';
import Fastify, { FastifyInstance } from 'fastify';
import {
  FileMigrationProvider,
  Kysely,
  Migrator,
  PostgresDialect,
  sql,
} from 'kysely';
import { Pool } from 'pg';
import { testConfig } from './test-config';
import buildApp from '../src/app';
import { Database } from '../src/types/kysely.types';

// Hoisted variables for test context
let server: FastifyInstance | null = null;
let db: Kysely<Database> | null = null;
let pool: Pool | null = null;

// Create axios instance for testing API calls
const request = axios.create({
  baseURL: `http://localhost:${testConfig.port}`,
  validateStatus: () => true,
});

export async function before() {
  const adminDb = new Kysely<any>({
    dialect: new PostgresDialect({
      pool: new Pool(testConfig.adminDatabase),
    }),
  });

  const { database } = testConfig.database;
  await sql`drop database if exists ${sql.id(database!)}`.execute(adminDb);
  await sql`create database ${sql.id(database!)}`.execute(adminDb);
  await adminDb.destroy();

  const migrationDb = new Kysely<any>({
    dialect: new PostgresDialect({
      pool: new Pool(testConfig.database),
    }),
  });

  const migrator = new Migrator({
    db: migrationDb,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, '../migrations'),
    }),
  });

  await migrator.migrateToLatest();
  await migrationDb.destroy();

  console.log('Initializing database...');
  pool = new Pool(testConfig.database);
  db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool }),
  });
  console.log('Database initialized:', !!db);
}

export async function beforeEach() {
  console.log('Starting beforeEach...');
  
  // Reinitialize the database connection if it has been destroyed
  if (!db) {
    console.log('Reinitializing database connection...');
    pool = new Pool(testConfig.database);
    db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool }),
    });
  }

  server = Fastify({ logger: false });
  if (!db) {
    throw new Error('Database connection is not initialized. Did you forget to call before()?');
  }
  await server.register(buildApp, { db });
  await server.listen({ port: testConfig.port, host: '0.0.0.0' });
  console.log('beforeEach complete.');
}

export async function afterEach() {
  if (server) {
    console.log('Closing server...');
    await server.close();
    server = null;
  }

  // Optionally destroy the database connection after each test
  if (db) {
    console.log('Destroying database connection in afterEach...');
    await db.destroy();
    db = null;
    pool = null;
  }
}

export async function after() {
  // console.log('Destroying database connection...');
  // if (db) {
  //   await db.destroy();
  //   db = null;
  // }
  // if (pool) {
  //   await pool.end();
  //   pool = null;
  // }
  // console.log('Database connection destroyed.');
}

export { request, db };