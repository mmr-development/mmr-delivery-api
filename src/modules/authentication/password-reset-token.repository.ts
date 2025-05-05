import { Kysely } from 'kysely';
import { Database } from '../../database';
import * as crypto from 'crypto';

export interface PasswordResetTokenRepository {
  createResetToken(email: string, token: string, expiresAt: Date): Promise<void>;
  markExistingTokensAsUsed(email: string): Promise<void>;
  findValidToken(email: string, token: string): Promise<any | undefined>;
  markTokenAsUsed(email: string, token: string): Promise<void>;
}

export function createPasswordResetTokenRepository(db: Kysely<Database>): PasswordResetTokenRepository {
  return {
    async createResetToken(email: string, token: string, expiresAt: Date): Promise<void> {
      await db.insertInto('password_reset_token')
        .values({
          email,
          token,
          expires_at: expiresAt,
          is_used: false
        })
        .execute();
    },
    async markExistingTokensAsUsed(email: string): Promise<void> {
      await db.updateTable('password_reset_token')
        .set({ is_used: true })
        .where('email', '=', email)
        .execute();
    },
    async findValidToken(email: string, token: string): Promise<any | undefined> {
      return await db.selectFrom('password_reset_token')
        .selectAll()
        .where('email', '=', email)
        .where('token', '=', token)
        .where('is_used', '=', false)
        .where('expires_at', '>', new Date())
        .executeTakeFirst();
    },

    async markTokenAsUsed(email: string, token: string): Promise<void> {
      await db.updateTable('password_reset_token')
        .set({ is_used: true })
        .where('email', '=', email)
        .where('token', '=', token)
        .execute();
    }
  };
}
