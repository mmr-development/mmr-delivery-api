import { FastifyPluginAsync } from 'fastify';
import { SignInMethodService } from '../users/sign-in-method/sign-in-method.service';
import { AuthenticationTokenService, RefreshToken } from './authentication-token.service';
import { UserService } from '../users/user.service';
import { PasswordResetTokenService } from './password-reset.service';
import { ChangePasswordRequest, changePasswordSchema, forgotPasswordSchema, loginSchema, logoutSchema, refreshTokenSchema, ResetPasswordParams, ResetPasswordRequest, resetPasswordSchema, signupSchema } from './auth.schema';

export interface AuthenticationControllerOptions {
    signInMethodService: SignInMethodService;
    authenticationTokenService: AuthenticationTokenService;
    userService: UserService;
    passwordResetService: PasswordResetTokenService;
}

export const authenticationController: FastifyPluginAsync<AuthenticationControllerOptions> = async function (server, { signInMethodService, authenticationTokenService, userService, passwordResetService }) {
    server.post<{ Body: { email: string, password: string }, Querystring: { client_id?: string } }>('/auth/sign-in/', { schema: { ...loginSchema } }, async (request, reply) => {
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

        reply.status(200).send({
            access_token: signedInUser.accessToken.accessToken,
            refresh_token: signedInUser.refreshToken.refreshToken
        });
    });

    server.post<{ Body: { refresh_token: string } }>('/auth/sign-out/', { schema: { ...logoutSchema }, preHandler: [server.authenticate] }, async (request, reply) => {
        const userId = request.user.sub;

        await request.revokeToken();

        const refreshToken = request.body.refresh_token;

        await authenticationTokenService.revokeRefreshToken(userId, refreshToken);

        reply.status(200).send({
            message: "Successfully logged out"
        });
    });

    server.post<{ Body: { refresh_token: string } }>('/auth/refresh-token/', { schema: { ...refreshTokenSchema } }, async (request, reply) => {
        const { refresh_token } = request.body;

        const { accessToken, refreshToken } = await authenticationTokenService.rotateTokens(refresh_token);

        reply.status(200).send({
            access_token: accessToken.accessToken,
            refresh_token: refreshToken.refreshToken
        });
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