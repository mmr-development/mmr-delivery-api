import { Kysely } from 'kysely';
import { Database } from '../../database';
import { RefreshTokenRow, InsertableRefreshTokenRow, UpdateableRefreshTokenRow } from './refresh-token.table';

export interface RefreshTokenRepository {
    insertRefreshToken(userId: string): Promise<RefreshTokenRow>;
    updateRefreshToken(refreshTokenId: string, patch: Pick<UpdateableRefreshTokenRow, 'last_refreshed_at'>): Promise<void>;
    deleteRefreshToken(refreshToken: string): Promise<void>;
    refreshTokenExists(refreshTokenId: string): Promise<RefreshTokenRow | undefined>;
}

export function createRefreshTokenRepository(db: Kysely<Database>): RefreshTokenRepository {
    return {
        insertRefreshToken: async function (userId: string): Promise<RefreshTokenRow> {
            const [refreshToken] = await db.insertInto('refresh_token')
                .values({
                    user_id: userId,
                    last_refreshed_at: new Date(),
                })
                .returningAll()
                .execute();

            return refreshToken;
        },
        async updateRefreshToken(refreshTokenId: string, patch: Pick<UpdateableRefreshTokenRow, 'last_refreshed_at'>): Promise<void> {
            await db.updateTable('refresh_token')
                .set(patch)
                .where('refresh_token_id', '=', refreshTokenId)
                .execute();
        },
        async deleteRefreshToken(refreshToken: string): Promise<void> {
            await db.deleteFrom('refresh_token')
                .where('refresh_token_id', '=', refreshToken)
                .execute();
        },
        async refreshTokenExists(refreshTokenId: string): Promise<RefreshTokenRow | undefined> {
            return await db
                .selectFrom('refresh_token')
                .selectAll()
                .where('refresh_token_id', '=', refreshTokenId)
                .executeTakeFirst();
        }
    }
}
