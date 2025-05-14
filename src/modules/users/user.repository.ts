import { Database } from '../../database';
import { Kysely, Transaction } from 'kysely';
import { InsertableUserRow, UserRow } from './user.table';

export interface UserRepository {
    insertUser(trx: Transaction<Database>, user: InsertableUserRow): Promise<UserRow>;
    createCustomerUser(user: InsertableUserRow): Promise<UserRow>;
    createPartnerUser(user: InsertableUserRow): Promise<UserRow>;
    findUserById(id: string): Promise<UserRow | undefined>;
    findUserByEmail(email: string): Promise<UserRow | undefined>;
    lockUserById(trx: Transaction<Database>, id: string): Promise<UserRow | undefined>;
    lockUserByEmail(trx: Transaction<Database>, email: string): Promise<UserRow | undefined>;
    lockUser(trx: Transaction<Database>, column: 'id' | 'email', value: string): Promise<UserRow | undefined>;
    findAllUsers(options?: { offset?: number, limit?: number, filters?: { email?: string; name?: string; phone_number?: string; } }): Promise<{ users: UserRow[]; count?: number; }>;
}

export function createUserRepository(db: Kysely<Database>): UserRepository {
    return {
        insertUser: async function (trx: Transaction<Database>, user: InsertableUserRow): Promise<UserRow> {
            const insertedUser = await db
                .insertInto('user')
                .values(user)
                .returningAll()
                .executeTakeFirstOrThrow()

            return insertedUser
        },
        createCustomerUser: async function (user: InsertableUserRow): Promise<UserRow> {
            const insertedUser = await db
                .insertInto('user')
                .values(user)
                .returningAll()
                .executeTakeFirstOrThrow()

            return insertedUser
        },
        createPartnerUser: async function (user: InsertableUserRow): Promise<UserRow> {
            const insertedUser = await db
                .insertInto('user')
                .values(user)
                .returningAll()
                .executeTakeFirstOrThrow()

            return insertedUser
        },
        findUserById: async function (id: string): Promise<UserRow | undefined> {
            const user = await db.selectFrom('user')
                .where('id', '=', id)
                .selectAll('user')
                .executeTakeFirst();

            return user
        },
        findUserByEmail: async function (email: string): Promise<UserRow | undefined> {
            const user = await db.selectFrom('user')
                .where('email', '=', email)
                .selectAll('user')
                .executeTakeFirst();

            return user
        },
        lockUserById: async function (trx: Transaction<Database>, id: string): Promise<UserRow | undefined> {
            return this.lockUser(trx, 'id', id)
        },
        lockUserByEmail: async function (trx: Transaction<Database>, email: string): Promise<UserRow | undefined> {
            return this.lockUser(trx, 'email', email)
        },
        lockUser: async function (trx: Transaction<Database>, column: 'id' | 'email', value: string): Promise<UserRow | undefined> {
            const user = await db.selectFrom('user')
                .where(column, '=', value)
                .selectAll('user')
                .forUpdate()
                .executeTakeFirst();

            return user
        },
        findAllUsers: async function (options?: {
            offset?: number;
            limit?: number;
            filters?: { email?: string; name?: string; phone_number?: string; }
        }): Promise<{ users: (UserRow & { roles: { id: string; name: string; description: string }[] })[]; count?: number; }> {
            const offset = options?.offset ?? 0;
            const limit = options?.limit ?? null;
            const filters = options?.filters ?? {};
        
            // Fetch users
            let baseQuery = db.selectFrom('user');
            if (filters.email) baseQuery = baseQuery.where('email', '=', filters.email);
            if (filters.phone_number) baseQuery = baseQuery.where('phone_number', '=', filters.phone_number);
            if (filters.name) {
                const searchTerm = `%${filters.name}%`;
                baseQuery = baseQuery.where(eb =>
                    eb.or([
                        eb('first_name', 'like', searchTerm),
                        eb('last_name', 'like', searchTerm)
                    ])
                );
            }
        
            const { count } = await baseQuery
                .select((eb) => eb.fn.countAll().as('count'))
                .executeTakeFirstOrThrow();
        
            let query = baseQuery
                .selectAll('user')
                .orderBy('id')
                .offset(offset);
        
            if (limit !== null) query = query.limit(limit);
        
            const users = await query.execute();
        
            // Fetch roles for these users
            const userIds = users.map(u => u.id);
            let userRoles: { user_id: string; id: string; name: string; description: string }[] = [];
            if (userIds.length > 0) {
                userRoles = await db
                    .selectFrom('user_role')
                    .innerJoin('role', 'user_role.role_id', 'role.id')
                    .where('user_role.user_id', 'in', userIds)
                    .select([
                        'user_role.user_id as user_id',
                        'role.id as id',
                        'role.name as name',
                        'role.description as description'
                    ])
                    .execute();
            }
        
            // Map roles to users
            const rolesMap = new Map<string, { id: string; name: string; description: string }[]>();
            for (const ur of userRoles) {
                if (!rolesMap.has(ur.user_id)) rolesMap.set(ur.user_id, []);
                rolesMap.get(ur.user_id)!.push({ id: ur.id, name: ur.name, description: ur.description });
            }
        
            const usersWithRoles = users.map(u => ({
                ...u,
                roles: rolesMap.get(u.id) ?? []
            }));
        
            return {
                users: usersWithRoles,
                count: Number(count)
            };
        }
    }
}
