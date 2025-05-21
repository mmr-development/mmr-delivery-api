import { Kysely } from 'kysely';
import { Database } from '../../database';
import { RoleRow, InsertableRoleRow, UpdateableRoleRow } from './role.table';
import { GetRolesOptions } from './role.service';

export interface RoleRepository {
    createRole(role: InsertableRoleRow): Promise<RoleRow>;
    getRoles(options: GetRolesOptions): Promise<{ roles: RoleRow[]; total: number }>;
    getRoleById(id: string): Promise<RoleRow | undefined>;
    updateRole(id: string, role: UpdateableRoleRow): Promise<RoleRow>;
    deleteRole(id: string): Promise<void>;
}

export function createRoleRepository(db: Kysely<Database>): RoleRepository {
    return {
        async createRole(role) {
            return await db.insertInto('role')
                .values(role)
                .returningAll()
                .executeTakeFirstOrThrow();
        },
        async getRoles(options) {
            let query = db.selectFrom('role');

            if (options.name) {
                query = query.where('name', '=', options.name);
            }
            if (options.offset !== undefined) {
                query = query.offset(options.offset);
            }
            if (options.limit !== undefined) {
                query = query.limit(options.limit);
            }

            const roles = await query.selectAll().execute();

            const countResult = await db.selectFrom('role')
                .select(({ fn }) => [fn.countAll().as('count')])
                .executeTakeFirst();
            const total = Number(countResult?.count ?? 0);

            return { roles, total };
        },
        async getRoleById(id) {
            return await db.selectFrom('role')
                .selectAll()
                .where('id', '=', id)
                .executeTakeFirst();
        },
        async updateRole(id, role) {
            return await db.updateTable('role')
                .set(role)
                .where('id', '=', id)
                .returningAll()
                .executeTakeFirstOrThrow();
        },
        async deleteRole(id) {
            await db.deleteFrom('role')
                .where('id', '=', id)
                .execute();
        }
    };
}