import { Database } from '../../database';
import { Kysely } from 'kysely';

export interface PushNotificationRepository {
    getPushTokensForUser(userId: string): Promise<string[]>;
}

export function createPushNotificationRepository(db: Kysely<Database>): PushNotificationRepository {
    return {
        getPushTokensForUser: async function (userId: string): Promise<string[]> {
            const pushTokens = await db.selectFrom('push_token')
                .select('token')
                .where('user_id', '=', userId)
                .selectAll()
                .execute()

            return pushTokens.map(token => token.token);
        }
    };
}
