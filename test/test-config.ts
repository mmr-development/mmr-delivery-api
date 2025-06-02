import { ConnectionConfig } from 'pg';
import { Config } from '../src/config';

export interface TestConfig extends Config {
  readonly adminDatabase: ConnectionConfig
}

export const testConfig: TestConfig = {
  appUrl: 'http://localhost:8050',
  host: 'localhost',
  port: 8050,
  database: {
    host: 'localhost',
    port: 5432,
    database: 'mmr_delivery_test',
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
    password: '',
  },
  cookie: {
    secret: 'mmr_delivery_test',
    name: 'mmr_delivery_test',
    sameSite: 'none',
    secure: false,
    httpOnly: true,
    refreshTokenMaxAge: 604800, // 7 days in seconds
    accessTokenMaxAge: 900, // 15 minutes in seconds
  },
  jwt: {
    algorithm: 'RS256',
    accessTokenExpiration: '15m',
    refreshTokenExpiration: '7d',
  },
  email: {
    host: 'smtp.gmail.com',
    port: 465,
    secure: false,
    user: '',
    password: '',
    from: '',
  }
}