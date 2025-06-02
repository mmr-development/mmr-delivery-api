import { FastifyPluginAsync, FastifyReply } from 'fastify';
import { EmailAlreadyExistsError, InvalidCredentialsError, InvalidSignInMethodError, SignInMethodService, UserNotFoundError } from '../users/sign-in-method/sign-in-method.service';
import { AuthenticationTokenService, RefreshToken } from './authentication-token.service';
import { UserService } from '../users/user.service';
import { PasswordResetTokenService } from './password-reset.service';
import { ChangePasswordRequest, changePasswordSchema, forgotPasswordSchema, loginSchema, logoutSchema, refreshTokenSchema, ResetPasswordParams, ResetPasswordRequest, resetPasswordSchema, signupSchema } from './auth.schema';
import { ControllerError } from '../../utils/errors';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { config } from '../../config';

export interface AuthenticationControllerOptions {
    signInMethodService: SignInMethodService;
    authenticationTokenService: AuthenticationTokenService;
    userService: UserService;
    passwordResetService: PasswordResetTokenService;
}

const tokenProcessingMap = new Map<string, {
    result?: {
        accessToken: { accessToken: string },
        refreshToken: { refreshToken: string }
    },
    timestamp: number
}>();

export const authenticationController: FastifyPluginAsync<AuthenticationControllerOptions> = async function (server, { signInMethodService, authenticationTokenService, userService, passwordResetService }) {

    function setAuthCookies(reply: FastifyReply, accessToken: string, refreshToken: string) {
        reply.setCookie('access_token', accessToken, {
            httpOnly: config.cookie.httpOnly,
            secure: true,
            sameSite: 'none',
            path: '/',
            maxAge: config.cookie.accessTokenMaxAge,
        });

        reply.setCookie('refresh_token', refreshToken, {
            httpOnly: config.cookie.httpOnly,
            secure: true,
            sameSite: 'none',
            path: '/',
            maxAge: config.cookie.refreshTokenMaxAge,
        });
    }
    server.post<{ Body: { email: string, password: string }, Querystring: { client_id: string } }>('/auth/sign-in/', { schema: { ...loginSchema } }, async (request, reply) => {
        try {
            const { email, password } = request.body;
            const { client_id } = request.query;

            const signInMethod = {
                email,
                password,
                client_id
            };

            const signedInUser = await request.db.transaction().execute(async (trx) => {
                return await signInMethodService.signInUsingPassword(trx, signInMethod);
            });

            setAuthCookies(
                reply,
                signedInUser.accessToken.accessToken,
                signedInUser.refreshToken.refreshToken
            );

            reply.status(200).send({
                access_token: signedInUser.accessToken.accessToken,
                refresh_token: signedInUser.refreshToken.refreshToken
            });
        } catch (error) {
            if (error instanceof InvalidCredentialsError || error instanceof UserNotFoundError) {
                throw new ControllerError(401, "InvalidCredentials", "Invalid credentials");
            } else if (error instanceof InvalidSignInMethodError) {
                throw new ControllerError(404, "InvalidSignInMethod", "Invalid sign-in method");
            }
        }
    });

    server.post<{ Body: { refresh_token: string } }>('/auth/sign-out/', { schema: { ...logoutSchema }, preHandler: [server.authenticate] }, async (request, reply) => {
        const userId = request.user.sub;

        await request.revokeToken();

        let refreshToken = request.cookies.refresh_token;

        if (!refreshToken && request.body.refresh_token) {
            refreshToken = request.body.refresh_token;
        }

        if (refreshToken) {
            await authenticationTokenService.revokeRefreshToken(userId, refreshToken);
        }

        reply.clearCookie('access_token', { path: '/' });
        reply.clearCookie('refresh_token', { path: '/' });

        reply.status(200).send({
            message: "Successfully logged out"
        });
    })

    server.post<{ Body: { refresh_token?: string } }>('/auth/refresh-token/', { schema: { tags: ['Authentication'] }}, async (request, reply) => {

        let refreshToken = request.cookies.refresh_token;
        if (!refreshToken && request.body.refresh_token) {
            refreshToken = request.body.refresh_token;
        }

        if (!refreshToken) {
            return reply.status(400).send({ message: "Refresh token is required" });
        }
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        const processingInfo = tokenProcessingMap.get(tokenHash);

        if (processingInfo && Date.now() - processingInfo.timestamp < 5000) {
            if (processingInfo.result) {
                setAuthCookies(
                    reply,
                    processingInfo.result.accessToken.accessToken,
                    processingInfo.result.refreshToken.refreshToken
                );

                return reply.status(200).send({
                    access_token: processingInfo.result.accessToken.accessToken,
                    refresh_token: processingInfo.result.refreshToken.refreshToken,
                    cached: true,
                });
            } else {
                return reply.status(429).send({
                    message: "Token refresh in progress",
                });
            }
        }

        // Set processing status and clean up old entries
        tokenProcessingMap.set(tokenHash, { timestamp: Date.now() });
        if (tokenProcessingMap.size > 1000) {
            const oldestEntries = [...tokenProcessingMap.entries()]
                .sort((a, b) => a[1].timestamp - b[1].timestamp)
                .slice(0, 100);

            for (const [key] of oldestEntries) {
                tokenProcessingMap.delete(key);
            }
        }

        try {
            const decodedToken = authenticationTokenService.verifyToken(refreshToken) as jwt.JwtPayload & { roles?: string[] };

            if (!decodedToken.roles) {
                decodedToken.roles = [];
            }

            const { accessToken, refreshToken: newRefreshToken } =
                await authenticationTokenService.rotateTokens(refreshToken);

            tokenProcessingMap.set(tokenHash, {
                result: { accessToken, refreshToken: newRefreshToken },
                timestamp: Date.now()
            });

            setAuthCookies(
                reply,
                accessToken.accessToken,
                newRefreshToken.refreshToken
            );

            return reply.status(200).send({
                access_token: accessToken.accessToken,
                refresh_token: newRefreshToken.refreshToken,
            });
        } catch (error) {
            console.log('Error verifying refresh token:', error);
            return reply.status(401).send({
                error: error,
                message: "Invalid or expired refresh token"
            });
        }
    });

    server.post<{ Body: { email: string } }>('/auth/forgot-password/', { schema: { ...forgotPasswordSchema } }, async (request, reply) => {
        const { email } = request.body;

        const user = await userService.findUserByEmail(email);

        if (user) {
            await passwordResetService.generateResetToken(email);
        }

        return reply.status(200).send({
            message: "If an account with that email exists, a password reset link has been sent."
        });
    });

    server.post<{ Body: ResetPasswordRequest, Params: ResetPasswordParams }>('/auth/reset-password/:token/', { schema: { ...resetPasswordSchema } }, async (request, reply) => {
        const { password } = request.body;
        const { token } = request.params;

        const isValid = await passwordResetService.validateResetToken(token);
        if (!isValid) {
            return reply.status(400).send({
                statusCode: 400,
                error: "Bad Request",
                message: "Invalid or expired token"
            });
        }

        const tokenData = await passwordResetService.findValidToken(token);

        if (!tokenData) {
            return reply.status(400).send({
                statusCode: 400,
                error: "Bad Request",
                message: "Invalid or expired token"
            });
        }

        await request.db.transaction().execute(async (trx) => {
            await signInMethodService.resetPasswordForEmail(trx, tokenData.email, password);
            await passwordResetService.consumeResetToken(tokenData.email, token);
        });

        return reply.status(200).send({
            message: "Password reset successfully"
        })
    });

    server.post<{ Body: ChangePasswordRequest }>('/auth/change-password/', { schema: { ...changePasswordSchema }, preHandler: [server.authenticate] }, async (request, reply) => {
        const userId = request.user.sub;
        const { new_password } = request.body;

        await request.db.transaction().execute(async (trx) => {
            await signInMethodService.updatePasswordSignInMethod(trx, userId, {
                password: new_password
            })
        })

        return reply.status(200).send({
            message: "Password changed successfully",
            statusCode: 200
        });
    });

    server.post<{ Body: { first_name: string, last_name: string, email: string, phone_number: string, password: string } }>('/auth/sign-up/', { schema: { ...signupSchema } }, async (request, reply) => {
        const { ...userRequest } = request.body;

        try {
            const signedUpUser = await request.db.transaction().execute(async (trx) => {
                return signInMethodService.signUpWithPassword(trx, userRequest);
            });

            reply.status(201).send({
                message: "Customer account created successfully",
                user: signedUpUser.user,
            });
        } catch (error) {
            if (error instanceof EmailAlreadyExistsError) {
                throw new ControllerError(409, "EmailAlreadyExists", "A user with this email already exists");
            }
        }
    });
}