import { ConnectionConfig } from 'pg';
import { Config } from '../src/config';

export interface TestConfig extends Config {
  readonly adminDatabase: ConnectionConfig
}

export const testConfig: TestConfig = {
  host: 'localhost',
  port: 8050,
  database: {
    host: 'postgres',
    port: 5432,
    database: 'mmr_delivery_test',
    user: 'postgres',
    password: 'postgres',
  },
  adminDatabase: {
    host: 'postgres',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres',
  },
  redis: {
    host: 'redis',
    port: 6379,
    password: undefined,
  },
  jwt: {
    algorithm: 'RS256',
    accessTokenExpiration: 3600, // 1 hour in seconds
    refreshTokenExpiration: 604800, // 7 days in seconds
  }
}