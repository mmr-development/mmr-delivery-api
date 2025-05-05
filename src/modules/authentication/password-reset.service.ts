import * as crypto from 'crypto';
import { PasswordResetTokenRepository } from './password-reset-token.repository';
import { EmailService } from '../email';

export interface PasswordResetTokenService {
    generateResetToken(email: string): Promise<string>;
    findValidToken(token: string): Promise<void>;
    validateResetToken(email: string, token: string): Promise<boolean>;
    consumeResetToken(email: string, token: string): Promise<void>;
}

export function createPasswordResetService(repository: PasswordResetTokenRepository, emailService: EmailService): PasswordResetTokenService {
    return {
        async generateResetToken(email: string): Promise<string> {
            await repository.markExistingTokensAsUsed(email);

            const token = crypto.randomBytes(64).toString('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

            await repository.createResetToken(email, token, expiresAt);

            await emailService.sendPasswordResetEmail(email, token);

            return token;
        },
        findValidToken: async function(token: string): Promise<void> {
            
        },
        async validateResetToken(email: string, token: string): Promise<boolean> {
            const validToken = await repository.findValidToken(email, token);
            return !!validToken;
        },
        async consumeResetToken(email: string, token: string): Promise<void> {
            await repository.markTokenAsUsed(email, token);
        }
    };
}
