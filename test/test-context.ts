import * as path from 'path'
import axios from 'axios'
import { promises as fs } from 'fs'
import Fastify, { FastifyInstance } from 'fastify'
import {
  FileMigrationProvider,
  Kysely,
  Migrator,
  PostgresDialect,
  sql,
} from 'kysely'
import { Pool } from 'pg'
import { testConfig } from './test-config'
import buildApp from '../src/app'
import { Database } from '../src/types/kysely.types'

// Hoisted variables for test context
let server: FastifyInstance
let db: Kysely<Database>

// Create axios instance for testing API calls
const request = axios.create({
  baseURL: `http://localhost:${testConfig.port}`,
  validateStatus: () => true,
})

export async function before() {
  const adminDb = new Kysely<any>({
    dialect: new PostgresDialect({
      pool: new Pool(testConfig.adminDatabase),
    }),
  })

  // Create our test database
  const { database } = testConfig.database
  await sql`drop database if exists ${sql.id(database!)}`.execute(adminDb)
  await sql`create database ${sql.id(database!)}`.execute(adminDb)
  await adminDb.destroy()

  // Now connect to the test database and run the migrations
  const migrationDb = new Kysely<any>({
    dialect: new PostgresDialect({
      pool: new Pool(testConfig.database),
    }),
  })

  const migrator = new Migrator({
    db: migrationDb,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, '../src/migrations'),
    }),
  })

  await migrator.migrateToLatest()
  await migrationDb.destroy()
}

export async function beforeEach() {
  // Create a fresh database connection for each test
  db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool(testConfig.database),
    }),
  })

  // Create and configure the server for each test
  server = Fastify({ logger: false })
  await server.register(buildApp, { db })
  
  // Start the server
  await server.listen({ port: testConfig.port, host: '0.0.0.0' })
}

export async function afterEach() {
  // Close server first to stop accepting new requests
  if (server) {
    await server.close()
  }
  
  // Then destroy database connection pool
  if (db) {
    await db.destroy()
  }
}

export async function after() {
  // Optional cleanup after all tests
}

// Helper functions for tests
export async function createUser() {
  const res = await request.post(`/api/v1/user`, {
    firstName: 'Test',
    lastName: 'Testerson',
  })

  return res.data
}

export { request, db }