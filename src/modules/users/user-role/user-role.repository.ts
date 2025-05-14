import { Kysely, Transaction } from 'kysely';
import { Database } from '../../../database';
import { UserRoleRow, UserRoleWithName } from './user-role.table';

export interface UserRoleRepository {
    assignRoleToUser(userId: string, roleName: string): Promise<void>;
    getUserRole(userId: string, roleName: string): Promise<UserRoleWithName | undefined>;
}

export function createUserRoleRepository(db: Kysely<Database>): UserRoleRepository {
    return {
        assignRoleToUser: async function (userId: string, roleName: string): Promise<void> {
            const role = await db
                .selectFrom('role')
                .select('id')
                .where('name', '=', roleName)
                .executeTakeFirstOrThrow();

            await db
                .insertInto('user_role')
                .values({
                    user_id: userId,
                    role_id: role.id,
                })
                .execute();
        },
        getUserRole: async function (userId: string, role: string): Promise<UserRoleWithName | undefined> {
            console.log(role);
            const userRole = await db
                .selectFrom('user_role')
                .innerJoin('role', 'user_role.role_id', 'role.id')
                .selectAll('user_role')
                .select('role.name as role_name') 
                .where('user_role.user_id', '=', userId)
                .where('role.name', '=', role)
                .executeTakeFirst();

            return userRole;
        },
    };
}
