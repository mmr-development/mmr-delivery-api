import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import * as ctx from '../test-context';

import { User } from '../../src/modules/users/user';

describe('Authentication API tests', () => {
  before(ctx.before)
  beforeEach(ctx.beforeEach)

  afterEach(ctx.afterEach)

  it('should create a user', async () => {
    const response = await ctx.request.post(`/auth/sign-up/customer`, {
      first_name: 'Anon',
      last_name: 'Doe',
      email: 'anon@doe.com',
      password: 'SecurePassword123',
    })

    assert.strictEqual(response.status, 201);
    // assert successfully created user
    assert.strictEqual(response.data.message, 'Customer account created successfully');
    // assert.strictEqual(response.data.user.first_name, 'Anon');
    // assert.strictEqual(response.data.user.last_name, 'Doe');
    // assert.strictEqual(response.data.user.email, 'anon@doe.com');

    // The returned auth token should be usable.
    // const getRes = await ctx.request.get<{ user: User }>(
    //   `/api/v1/user/${res.data.user.id}`,
    //   createAuthHeaders(res.data.authToken)
    // )

    // assert.strictEqual(getRes.status, 200);
    // assert.deepStrictEqual(getRes.data.user, res.data.user);
  })

  it('should sign in a user', async () => {
    const response = await ctx.request.post(`/auth/login`, {
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
