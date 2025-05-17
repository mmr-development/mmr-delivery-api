import { FastifyPluginAsync } from 'fastify';
import { InvalidCredentialsError, InvalidSignInMethodError, SignInMethodService, UserNotFoundError } from '../users/sign-in-method/sign-in-method.service';
import { AuthenticationTokenService, RefreshToken } from './authentication-token.service';
import { UserService } from '../users/user.service';
import { PasswordResetTokenService } from './password-reset.service';
import { ChangePasswordRequest, changePasswordSchema, forgotPasswordSchema, loginSchema, logoutSchema, refreshTokenSchema, ResetPasswordParams, ResetPasswordRequest, resetPasswordSchema, signupSchema } from './auth.schema';
import { ControllerError } from '../../utils/errors';
import * as jwt from 'jsonwebtoken';

export interface AuthenticationControllerOptions {
    signInMethodService: SignInMethodService;
    authenticationTokenService: AuthenticationTokenService;
    userService: UserService;
    passwordResetService: PasswordResetTokenService;
}

export const authenticationController: FastifyPluginAsync<AuthenticationControllerOptions> = async function (server, { signInMethodService, authenticationTokenService, userService, passwordResetService }) {
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

            // Set HTTP-only cookie for access token
            reply.setCookie('access_token', signedInUser.accessToken.accessToken, {
                httpOnly: true,         // prevent JS access
                secure: true,           // HTTPS only (allowed on localhost)
                sameSite: 'none',       // permit cross-site usage
                path: '/',
                maxAge: 3600
            });

            // Set HTTP-only cookie for refresh token
            reply.setCookie('refresh_token', signedInUser.refreshToken.refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                path: '/',
                maxAge: 2592000
            });

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

        // Revoke the access token
        await request.revokeToken();
    
        // Try to get refresh token from cookie first, then from body
        let refreshToken = request.cookies.refresh_token;
        
        // If not in cookie, check request body
        if (!refreshToken && request.body.refresh_token) {
            refreshToken = request.body.refresh_token;
        }
    
        if (refreshToken) {
            // Revoke refresh token in database
            await authenticationTokenService.revokeRefreshToken(userId, refreshToken);
        }
    
        // Clean up cookies if they were used
        if (request.cookies.access_token) {
            reply.clearCookie('access_token', { path: '/' });
        }
        
        if (request.cookies.refresh_token) {
            reply.clearCookie('refresh_token', { path: '/auth/refresh-token/' });
        }
    
        reply.status(200).send({
            message: "Successfully logged out"
        });
    })

    server.post<{ Body: { refresh_token?: string }}>('/auth/refresh-token/', {  }, async (request, reply) => {
        let refreshToken = request.cookies.refresh_token;
        if (!refreshToken && request.body.refresh_token) {
            refreshToken = request.body.refresh_token;
        }

        if (!refreshToken) {
            return reply.status(400).send({ message: "Refresh token is required" });
        }

        try {
            const decodedToken = authenticationTokenService.verifyToken(refreshToken) as jwt.JwtPayload & { role?: string };
            
            if (!decodedToken.role) {
                throw new Error('Role not found in token');
            }
            
            // Pass the role in claims to maintain it during rotation
            const { accessToken, refreshToken: newRefreshToken } = await authenticationTokenService.rotateTokens(refreshToken, {
                role: decodedToken.role,
            });

            // Set cookies for both tokens
            reply.setCookie('refresh_token', newRefreshToken.refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                path: '/',
                maxAge: 2592000  // 30 days
            });

            reply.setCookie('access_token', accessToken.accessToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                path: '/',
                maxAge: 3600  // 1 hour
            });
        
            // Return tokens in response body too
            reply.status(200).send({
                access_token: accessToken.accessToken,
                refresh_token: newRefreshToken.refreshToken
            });
        } catch (error) {
            // Handle token validation errors
            reply.clearCookie('access_token', { path: '/' });
            reply.clearCookie('refresh_token', { path: '/' });
            
            return reply.status(401).send({ 
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

        // const isValid = await passwordResetService.validateResetToken(email, token);
        // if (!isValid) {
        //     return reply.status(400).send({
        //         statusCode: 400,  // Required field
        //         error: "Bad Request", // Required field
        //         message: "Invalid or expired token"
        //     });
        // }

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
    });

    server.post<{ Body: { first_name: string, last_name: string, email: string, phone_number: string, password: string, marketing_consent: boolean } }>('/auth/sign-up/', { schema: { ...signupSchema } }, async (request, reply) => {
        const { first_name, last_name, email, phone_number, password, marketing_consent } = request.body;

        const userRequest = {
            first_name,
            last_name,
            email,
            phone_number,
            password
        };

        const signedUpUser = await request.db.transaction().execute(async (trx) => {
            return signInMethodService.signUpWithPassword(trx, userRequest);
        });

        reply.status(201).send({
            message: "Customer account created successfully"
        });
    });
}