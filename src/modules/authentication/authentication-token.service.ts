import * as jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { config } from '../../config';
import { RefreshTokenRepository } from './refresh-token.repository';
import * as crypto from 'crypto';
import { 
    ExpiredAuthTokenError, 
    InvalidCredentialsError, 
    InvalidRefreshTokenError 
  } from '../../utils/errors';
import { Redis } from 'ioredis';

export class AccessTokenError extends Error { }
export class InvalidAccessTokenError extends AccessTokenError { }
export class AccessTokenExpiredError extends AccessTokenError { }
export class RefreshTokenUserIdMismatchError extends Error { }

export interface AuthenticationTokenService {
    createRefreshToken(sub: string): Promise<RefreshToken>;
    signRefreshToken(tokenPayload: RefreshTokenPayload): RefreshToken;
    createAccessToken(refreshToken: string): Promise<AccessToken>;
    verifyRefreshToken(token: string): Promise<RefreshTokenPayload>;
    verifyToken(token: string): string | jwt.JwtPayload;
    signAccessToken(tokenPayload: AccessTokenPayload): AccessToken;
    revokeRefreshToken(sub: string, refreshToken: string): Promise<void>;
    rotateTokens(refreshToken: string): Promise<{accessToken: AccessToken, refreshToken: RefreshToken}>;
}

interface AccessTokenPayload {
    sub: string;
    refresh_token_id: string;
    jti: string;
}

export interface AccessToken {
    accessToken: string;
}

export interface RefreshToken {
    refreshToken: string;
}

interface RefreshTokenPayload {
    sub: string;
    jti: string;
    is_refresh_token: true;
}

export function createAuthenticationTokenService(repository: RefreshTokenRepository): AuthenticationTokenService {
    let privateKey: string;
    let publicKey: string;


    try {
        // TEMPORARY SOLUTION: Hardcoded keys for debugging
        // TODO: Remove this and use proper file loading in production
        privateKey = `-----BEGIN PRIVATE KEY-----
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
In2tTdO31Ab9nL2TJSRgEbji
-----END PRIVATE KEY-----
`;

        publicKey = `-----BEGIN PUBLIC KEY-----
MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEA1ttRHQtuH9Z5bWed+Wh2
fTSGOUetSUX9s6MywT3ZOlvWwbQTIZd6T6YWOMh9mDlmE7eQFpKtAEinFB6Lzw4R
kIk7yd7sP4fbEpIUo5a4dNsuSQIDGA5csuC/+Pn6pm25Dx1mr26uXPtwCkGHBSpa
8k+K+DhlEHEHsJ0Dk0ms09yoEuUF74kdJhkALWQYEcFxLkdwjRZUuEwtBw4Z1r+E
bIom+L/kiQ34vakGWJTriuCePm95HJZhXRo5uGKqp3SFRatw9LDEJa7YTvD/a+cg
wUnEzz3rOWqNHm25Qx0IpMoNBt+5tow0INdkLwj3AqYCN0kPGhJMya+tfXSQRTQe
AL09EnkAI56n2A+Kqz/wRfuum+ekBSwRBS6M4jz8R2Uq8oaJljdG/IPRnW0uMOPe
03iTCwx/ctEu45S/1gjGiFo4980v9hvhpbeS55bl/EJZA+iSLrU7mHb8c7YRe8Lv
DZYI34XmwcnTnu3EmuRg3xJuF27bif4u1PLwYyq6v7evAgMBAAE=
-----END PUBLIC KEY-----
`;

        // Try to load from files as fallback
        if (!privateKey.includes('PRIVATE KEY')) {
            const keyPath = path.resolve(process.cwd(), 'keys', 'private.pem');
            privateKey = fs.readFileSync(keyPath, 'utf8');

            const publicKeyPath = path.resolve(process.cwd(), 'keys', 'public.pem');
            publicKey = fs.readFileSync(publicKeyPath, 'utf8');
        }
    } catch (error) {
        console.error('Failed to load private key:', error);
        throw new Error('Authentication service initialization failed: Could not load private key');
    }

    return {
        async createRefreshToken(userId: string): Promise<RefreshToken> {
            const { refresh_token_id } = await repository.insertRefreshToken(userId);

            return this.signRefreshToken({
                sub: userId,
                jti: refresh_token_id,
                is_refresh_token: true,
            });
        },
        signRefreshToken(tokenPayload: RefreshTokenPayload): RefreshToken {
            const options: jwt.SignOptions = {
                algorithm: config.jwt.algorithm as jwt.Algorithm,
                expiresIn: config.jwt.accessTokenExpiration,
            };
            return {
                refreshToken: jwt.sign(
                    { ...tokenPayload },
                    privateKey,
                    options
                )
            };
        },
        createAccessToken: async function (refreshToken: string): Promise<AccessToken> {
            const { sub, jti } = await this.verifyRefreshToken(refreshToken)

            await repository.updateRefreshToken(jti, {
                last_refreshed_at: new Date(),
            })

            return this.signAccessToken({ sub, refresh_token_id: jti, jti })
        },
        verifyRefreshToken: async function(token: string): Promise<RefreshTokenPayload> {
            const payload = this.verifyToken(token)

            if (
                !payload ||
                typeof payload !== 'object' ||
                typeof payload.sub !== 'string' ||
                typeof payload.jti !== 'string' ||
                payload.is_refresh_token !== true
            ) {
                throw new InvalidAccessTokenError()
            }

            const refreshTokenExists = await repository.refreshTokenExists(payload.jti);
            if (!refreshTokenExists) {
                throw new InvalidAccessTokenError('Refresh token has been revoked');
            }

            return {
                sub: payload.sub,
                jti: payload.jti,
                is_refresh_token: true,
            }
        },
        verifyToken(token: string): string | jwt.JwtPayload {
            try {
                return jwt.verify(token, publicKey, { algorithms: [config.jwt.algorithm as jwt.Algorithm] })
            } catch (error) {
                if (error instanceof jwt.TokenExpiredError) {
                    throw new AccessTokenExpiredError()
                }
                throw new InvalidAccessTokenError()
            }
        },
        signAccessToken(tokenPayload: AccessTokenPayload): AccessToken {
            const jti = crypto.randomUUID();
            const options: jwt.SignOptions = {
                algorithm: config.jwt.algorithm as jwt.Algorithm,
                expiresIn: config.jwt.accessTokenExpiration
            };

            return {
                accessToken: jwt.sign(
                    { ...tokenPayload, jti }, // Include JTI in payload
                    privateKey,
                    options
                )
            };
        },
        revokeRefreshToken: async function(userId: string, refreshToken: string): Promise<void> {
            const payload = await this.verifyRefreshToken(refreshToken);

            if (payload.sub !== userId) {
                throw new RefreshTokenUserIdMismatchError('User ID mismatch');
            }

            await repository.deleteRefreshToken(payload.jti);
        },
        rotateTokens: async function(refreshToken: string): Promise<{accessToken: AccessToken, refreshToken: RefreshToken}> {
            const { sub, jti } = await this.verifyRefreshToken(refreshToken);

            const newRefreshToken = await this.createRefreshToken(sub);
            
            const { jti: newRefreshTokenId } = await this.verifyRefreshToken(newRefreshToken.refreshToken);
            const accessToken = this.signAccessToken({ sub, refresh_token_id: newRefreshTokenId, jti: crypto.randomUUID() });
            
            await repository.deleteRefreshToken(jti);
            
            return {
                accessToken,
                refreshToken: newRefreshToken
            };
        },
    }
}
