import * as jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { config } from '../../config';
import { RefreshTokenRepository } from './refresh-token.repository';
import * as crypto from 'crypto';
import { Redis } from 'ioredis';

export class AccessTokenError extends Error { }
export class InvalidAccessTokenError extends AccessTokenError { }
export class AccessTokenExpiredError extends AccessTokenError { }
export class RefreshTokenUserIdMismatchError extends Error { }

export interface AuthenticationTokenService {
    createRefreshToken(sub: string, role: string): Promise<RefreshToken>;
    signRefreshToken(tokenPayload: RefreshTokenPayload): RefreshToken;
    createAccessToken(refreshToken: string, claims?: Record<string, any>): Promise<AccessToken>;
    verifyRefreshToken(token: string): Promise<RefreshTokenPayload>;
    verifyToken(token: string): string | jwt.JwtPayload;
    signAccessToken(tokenPayload: AccessTokenPayload, claims?: Record<string, any>): AccessToken;
    revokeRefreshToken(sub: string, refreshToken: string): Promise<void>;
    rotateTokens(refreshToken: string, claims?: Record<string, any>): Promise<{ accessToken: AccessToken, refreshToken: RefreshToken }>;
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
        async createRefreshToken(userId: string, role: string | string[]): Promise<RefreshToken> {
            const { refresh_token_id } = await repository.insertRefreshToken(userId);

            // Create the base payload
            const tokenPayload = {
                sub: userId,
                jti: refresh_token_id,
                is_refresh_token: true,
            };

            // Sign the token with roles in claims
            const options: jwt.SignOptions = {
                algorithm: config.jwt.algorithm as jwt.Algorithm,
                expiresIn: config.jwt.accessTokenExpiration,
            };
            
            // Store as a roles array if multiple, or role string if single
            const rolesClaim = Array.isArray(role) ? { roles: role } : { role };
            
            return {
                refreshToken: jwt.sign(
                    { ...tokenPayload, ...rolesClaim }, // Include roles in JWT payload
                    privateKey,
                    options
                )
            };
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
        
        createAccessToken: async function (refreshToken: string, claims?: Record<string, any>): Promise<AccessToken> {
            const payload = await this.verifyRefreshToken(refreshToken);
            const { sub, jti } = payload;
            
            // Get role from JWT claims
            const decodedToken = this.verifyToken(refreshToken) as jwt.JwtPayload;
            const roles = decodedToken.roles || [decodedToken.role].filter(Boolean);

            await repository.updateRefreshToken(jti, {
                last_refreshed_at: new Date(),
            });

            // Merge the role with any existing claims
            const updatedClaims = { 
                ...claims,
                role: roles
            };

            return this.signAccessToken({ sub, refresh_token_id: jti, jti }, updatedClaims);
        },
        
        verifyRefreshToken: async function (token: string): Promise<RefreshTokenPayload> {
            const payload = this.verifyToken(token);

            if (
                !payload ||
                typeof payload !== 'object' ||
                typeof payload.sub !== 'string' ||
                typeof payload.jti !== 'string' ||
                payload.is_refresh_token !== true
            ) {
                throw new InvalidAccessTokenError();
            }

            const refreshTokenExists = await repository.refreshTokenExists(payload.jti);
            if (!refreshTokenExists) {
                throw new InvalidAccessTokenError('Refresh token has been revoked');
            }

            return {
                sub: payload.sub,
                jti: payload.jti,
                is_refresh_token: true
            };
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
        signAccessToken(tokenPayload: AccessTokenPayload, claims?: Record<string, any>): AccessToken {
            const jti = crypto.randomUUID();
            const options: jwt.SignOptions = {
                algorithm: config.jwt.algorithm as jwt.Algorithm,
                expiresIn: config.jwt.accessTokenExpiration,
            };

            return {
                accessToken: jwt.sign(
                    { ...tokenPayload, jti, ...(claims || {}) }, // Include JTI in payload
                    privateKey,
                    options
                )
            };
        },
        revokeRefreshToken: async function (userId: string, refreshToken: string): Promise<void> {
            const payload = await this.verifyRefreshToken(refreshToken);

            if (payload.sub !== userId) {
                throw new RefreshTokenUserIdMismatchError('User ID mismatch');
            }

            await repository.deleteRefreshToken(payload.jti);
        },
        rotateTokens: async function (refreshToken: string, claims?: Record<string, any>): Promise<{ accessToken: AccessToken, refreshToken: RefreshToken }> {
            // Get the base payload
            const payload = await this.verifyRefreshToken(refreshToken);
            const { sub, jti } = payload;
            
            // Get role from JWT claims
            const decodedToken = this.verifyToken(refreshToken) as jwt.JwtPayload;
            const roles = decodedToken.roles || [decodedToken.role].filter(Boolean);

            const newRefreshToken = await this.createRefreshToken(sub, roles);

            const { jti: newRefreshTokenId } = await this.verifyRefreshToken(newRefreshToken.refreshToken);
            
            // Merge the role with any existing claims
            const updatedClaims = {
                ...claims,
                role: roles
            };
            
            const accessToken = this.signAccessToken({ 
                sub, 
                refresh_token_id: newRefreshTokenId, 
                jti: crypto.randomUUID() 
            }, updatedClaims);

            await repository.deleteRefreshToken(jti);

            return {
                accessToken,
                refreshToken: newRefreshToken
            };
        },
    };
}
