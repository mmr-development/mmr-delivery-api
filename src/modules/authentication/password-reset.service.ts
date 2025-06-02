import * as crypto from 'crypto';
import { PasswordResetTokenRepository } from './password-reset-token.repository';
import { EmailService } from '../email';

export interface PasswordResetTokenService {
    generateResetToken(email: string): Promise<string>;
    generateResetTokenWithoutEmail(email: string): Promise<string>;
    findValidToken(token: string): Promise<PasswordResetToken | undefined>;
    validateResetToken(token: string): Promise<boolean>;
    consumeResetToken(email: string, token: string): Promise<void>;
}

export interface PasswordResetToken {
    email: string;
    token: string;
    expires_at: Date;
    is_used: boolean;
}

export function createPasswordResetService(repository: PasswordResetTokenRepository, emailService: EmailService): PasswordResetTokenService {
    return {
        async generateResetToken(email: string): Promise<string> {
            await repository.markExistingTokensAsUsed(email);

            const randomBytes = crypto.randomBytes(32);
            const token = randomBytes.toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000);


            await repository.createResetToken(email, token, expiresAt);

            await emailService.sendPasswordResetEmail(email, token);

            return token;
        },
        async generateResetTokenWithoutEmail(email: string): Promise<string> {
            await repository.markExistingTokensAsUsed(email);

            const randomBytes = crypto.randomBytes(32);
            const token = randomBytes.toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

            await repository.createResetToken(email, token, expiresAt);

            return token;
        },
        findValidToken: async function(token: string): Promise<PasswordResetToken | undefined> {
            const validToken = await repository.findValidToken(token);
            if (!validToken) {
                return undefined;
            }
            return {
                email: validToken.email,
                token: validToken.token,
                expires_at: validToken.expires_at,
                is_used: validToken.is_used
            };
        },
        async validateResetToken(token: string): Promise<boolean> {
            const validToken = await repository.findValidToken(token);
            return !!validToken;
        },
        async consumeResetToken(email: string, token: string): Promise<void> {
            await repository.markTokenAsUsed(email, token);
        }
    };
}
