import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import * as ctx from '../test-context';

import { User } from '../../src/modules/users/user';

before(ctx.before)
after(ctx.after)
beforeEach(ctx.beforeEach)
afterEach(ctx.afterEach)

describe('Authentication API tests', () => {
  it('should create a user', async () => {
    const response = await ctx.request.post(`/api/v1/sign-up/customer`, {
      first_name: 'Anon',
      last_name: 'Doe',
      email: 'anon@doe.com',
      password: 'SecurePassword123',
    })
    assert.strictEqual(response.status, 201);
    assert.strictEqual(response.data.message, 'Customer account created successfully');
  })
})

describe('Authentication API tests123', () => {
  it('should sign in a user', async () => {
    const response = await ctx.request.post(`/api/v1/login`, {
      email: 'anon@doe.com',
      password: 'SecurePassword123',
    })
    const { access_token, refresh_token } = response.data;
  
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.data.access_token, access_token);
    assert.strictEqual(response.data.refresh_token, refresh_token);
  })
})

function createAuthHeaders(authToken: string) {
  return {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  }
}
