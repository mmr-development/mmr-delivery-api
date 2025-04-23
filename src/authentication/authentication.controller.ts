import { FastifyPluginAsync } from 'fastify';
import { SignInMethodService } from '../sign-in-method/sign-in-method.service';
import { AuthenticationTokenService, RefreshToken } from './authentication-token.service';
import { UserService } from '../users/user.service';

export interface AuthenticationControllerOptions {
    signInMethodService: SignInMethodService;
    authenticationTokenService: AuthenticationTokenService;
    userService: UserService;
}

export const authenticationController: FastifyPluginAsync<AuthenticationControllerOptions> = async function (server, { signInMethodService, authenticationTokenService, userService }) {
    server.post<{ Body: { email: string, password: string }, Querystring: { client_id?: string } }>('/login', async (request, reply) => {
        const { email, password } = request.body;
        const { client_id } = request.query;

        const signInMethod = {
            email,
            password,
            client_id
        };

        const signedInUser = await request.server.kysely.db.transaction().execute(async (trx) => {
            return await signInMethodService.signInUsingPassword(trx, signInMethod);
        });

        reply.status(200).send({
            access_token: signedInUser.accessToken.accessToken,
            refresh_token: signedInUser.refreshToken.refreshToken
        });
    });

    server.post<{ Body: { refresh_token: string } }>('/logout', { schema: {}, preHandler: [server.authenticate] }, async (request, reply) => {
        const userId = request.user.sub;

        await request.revokeToken();

        const refreshToken = request.body.refresh_token;

        await authenticationTokenService.revokeRefreshToken(userId, refreshToken);

        reply.status(200).send({
            message: "Successfully logged out"
        });
    });

    server.post<{ Body: { refresh_token: string } }>('/refresh-token', { schema: {} }, async (request, reply) => {
        const { refresh_token } = request.body;

        const { accessToken, refreshToken } = await authenticationTokenService.rotateTokens(refresh_token);

        reply.status(200).send({
            access_token: accessToken.accessToken,
            refresh_token: refreshToken.refreshToken
        });
    });

    server.post('/forgot-password', async (request, reply) => {

    });

    server.post('/sign-up/courier', async (request, reply) => {

    });

    server.post<{ Body: { first_name: string, last_name: string, email: string, password: string, marketing_consent: boolean}}>('/sign-up/customer', async (request, reply) => {
        const { first_name, last_name, email, password, marketing_consent } = request.body;

        const userRequest = {
            first_name,
            last_name,
            email,
            password
        };

        const signedUpUser = await request.server.kysely.db.transaction().execute(async (trx) => {
            return signInMethodService.signUpWithPassword(trx, userRequest);
        });

        reply.status(201).send({
            message: "Customer account created successfully"
        });
    });

    server.post('/sign-up/restaurant', async (request, reply) => {

    });
}