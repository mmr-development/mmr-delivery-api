import * as jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import config from '../config';
import { RefreshTokenRepository } from './refresh-token.repository';
import * as crypto from 'crypto';
import { 
    ExpiredAuthTokenError, 
    InvalidCredentialsError, 
    InvalidRefreshTokenError 
  } from '../utils/errors';
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
    // blacklistAccessToken(token: string): Promise<void>;
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
        const keyPath = path.resolve(process.cwd(), 'keys', 'private.pem');
        privateKey = fs.readFileSync(keyPath, 'utf8');

        const publicKeyPath = path.resolve(process.cwd(), 'keys', 'public.pem');
        publicKey = fs.readFileSync(publicKeyPath, 'utf8');
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
        // async blacklistAccessToken(token: string): Promise<void> {
        //     try {
        //         const decoded = jwt.decode(token);
        //         if (!decoded || typeof decoded !== 'object' || !decoded.jti || !decoded.exp) {
        //             throw new InvalidAccessTokenError('Invalid token format');
        //         }
                
        //         const jti = decoded.jti;
        //         const exp = decoded.exp;
                
        //         // Calculate TTL (time to live) in seconds
        //         const now = Math.floor(Date.now() / 1000);
        //         const ttl = Math.max(0, exp - now);
                
        //         // Add the JTI to Redis blacklist with expiration
        //         await redisClient.set(`blacklist:${jti}`, '1', 'EX', ttl);
        //     } catch (error) {
        //         console.error('Failed to blacklist token:', error);
        //         throw error;
        //     }
        // },
        
    }
}
