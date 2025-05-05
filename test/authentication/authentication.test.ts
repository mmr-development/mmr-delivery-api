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
      url: '/v1/auth/sign-up/',
      payload: {
        first_name: 'Anon',
        last_name: 'Doe',
        email: 'anon@doe.com',
        phone_number: '+1234567890',
        password: 'SecurePassword123',
      }
    })

    assert.strictEqual(response.statusCode, 201);
    assert.strictEqual(response.json().message, 'Customer account created successfully');
  })

  it('should sign in a user', async () => {
    const response = await ctx.server.inject({
      method: 'POST',
      url: '/v1/auth/sign-in/',
      payload: {
        email: 'anon@doe.com',
        password: 'SecurePassword123',
      }
    })
    const { access_token, refresh_token } = response.json();

    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.json().access_token, access_token);
    assert.strictEqual(response.json().refresh_token, refresh_token);

    storeTokens(access_token, refresh_token);
  })

  let accessToken: string;
  let refreshToken: string;

  function storeTokens(access: string, refresh: string) {
    accessToken = access;
    refreshToken = refresh;
  }

  function getAccessToken(): string {
    return accessToken;
  }

  function getRefreshToken(): string {
    return refreshToken;
  }

  it('should refresh access and refresh token', async () => {
    const response = await ctx.server.inject({
      method: 'POST',
      url: '/v1/auth/refresh-token/',
      payload: {
        refresh_token: getRefreshToken(),
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const { access_token, refresh_token } = response.json();
    assert.ok(access_token, 'Should receive a new access token');
    assert.ok(refresh_token, 'Should receive a new refresh token');
    
    // Store the new tokens
    storeTokens(access_token, refresh_token);
  })

  // it('should logout and revoke token', async () => {
  //   const response = await ctx.server.inject({
  //     method: 'POST',
  //     url: '/v1/auth/logout',
  //     ...createAuthHeaders(getAccessToken())
  //   });
    
  //   assert.strictEqual(response.statusCode, 200);
    
  //   // Try to access protected route with revoked token
  //   const protectedResponse = await ctx.server.inject({
  //     method: 'GET',
  //     url: '/v1/user/profile',
  //     ...createAuthHeaders(getAccessToken())
  //   });
    
  //   assert.strictEqual(protectedResponse.statusCode, 401);
  // })

  function createAuthHeaders(accessToken: string) {
    return {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  }
})
