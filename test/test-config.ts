import { ConnectionConfig } from 'pg';
import { Config } from '../src/config';

export interface TestConfig extends Config {
  readonly adminDatabase: ConnectionConfig
}

export const testConfig: TestConfig = {
  host: '0.0.0.0',
  port: 8050,
  database: {
    host: 'localhost',
    port: 5432,
    database: 'just_authentication_test',
    user: 'postgres',
    password: 'postgres',
  },
  adminDatabase: {
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres',
  },
  redis: {
    host: 'localhost',
    port: 6379,
    password: undefined,
  },
  jwt: {
    algorithm: 'RS256',
    accessTokenExpiration: 3600, // 1 hour in seconds
    refreshTokenExpiration: 604800, // 7 days in seconds
  }
}