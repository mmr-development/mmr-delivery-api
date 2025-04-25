import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import * as ctx from '../test-context';

describe('Authentication API tests', () => {
  before(ctx.before)
  beforeEach(ctx.beforeEach)

  after(ctx.after)
  afterEach(ctx.afterEach)

  it('should create a user', async () => {
    const response = await ctx.server.inject({
      method: 'POST',
      url: '/api/v1/sign-up/customer',
      payload: {
        first_name: 'Anon',
        last_name: 'Doe',
        email: 'anon@doe.com',
        password: 'SecurePassword123',
      }
    })

    assert.strictEqual(response.statusCode, 201);
    assert.strictEqual(response.json().message, 'Customer account created successfully');
  })

  it('should sign in a user', async () => {
    const response = await ctx.server.inject({
      method: 'POST',
      url: '/api/v1/login',
      payload: {
        email: 'anon@doe.com',
        password: 'SecurePassword123',
      }
    })
    const { access_token, refresh_token } = response.json();

    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.json().access_token, access_token);
    assert.strictEqual(response.json().refresh_token, refresh_token);
  })
})

function createAuthHeaders(authToken: string) {
  return {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  }
}
