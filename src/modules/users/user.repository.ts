import { Database } from '../../database';
import { Kysely, Transaction, sql } from 'kysely';
import { InsertableUserRow, UpdateableUserRow, UserRow } from './user.table';

export interface UserRepository {
    insertUser(trx: Transaction<Database>, user: InsertableUserRow): Promise<UserRow>;
    createAnonymousUser(trx: Transaction<Database>, user: InsertableUserRow): Promise<UserRow>;
    createCustomerUser(user: InsertableUserRow): Promise<UserRow>;
    createPartnerUser(user: InsertableUserRow): Promise<UserRow>;
    findUserById(id: string): Promise<UserRow | undefined>;
    findUserWithAddressById(id: string): Promise<(UserRow & { address: any }) | undefined>;
    findUserByEmail(email: string): Promise<UserRow | undefined>;
    lockUserById(trx: Transaction<Database>, id: string): Promise<UserRow | undefined>;
    lockUserByEmail(trx: Transaction<Database>, email: string): Promise<UserRow | undefined>;
    lockUser(trx: Transaction<Database>, column: 'id' | 'email', value: string): Promise<UserRow | undefined>;
    findAllUsers(options?: { offset?: number, limit?: number, filters?: { email?: string; name?: string; phone_number?: string; } }): Promise<{ users: UserRow[]; count?: number; }>;
    savePushToken(userId: string, pushToken: string, appType: string): Promise<void>;
    updateUserProfile(userId: string, profileData: Partial<UserRow>): Promise<UserRow>;
    updateUserById(id: string, data: Partial<UpdateableUserRow>): Promise<UserRow>;
    associateAddressWithUser(userId: string, addressId: number): Promise<void>;
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
        createAnonymousUser: async function (trx: Transaction<Database>, user: InsertableUserRow): Promise<UserRow> {
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
        findUserWithAddressById: async function (id: string): Promise<(UserRow & { address: any }) | undefined> {
            const user = await db
                .selectFrom('user')
                .leftJoin('customer', 'customer.user_id', 'user.id')
                .leftJoin('address', 'address.id', 'customer.address_id')
                .leftJoin('street', 'address.street_id', 'street.id')
                .leftJoin('postal_code', 'address.postal_code_id', 'postal_code.id')
                .leftJoin('city', 'postal_code.city_id', 'city.id')
                .leftJoin('country', 'city.country_id', 'country.id')
                .selectAll('user')
                .select(sql`
                CASE WHEN address.id IS NOT NULL THEN
                jsonb_build_object(
                    'id', address.id,
                    'address_detail', address.address_detail,
                    'street', street.name,
                    'postal_code', postal_code.code,
                    'city', city.name,
                    'country', country.name
                )
            ELSE NULL END
        `.as('address'))
                .where('user.id', '=', id)
                .executeTakeFirst();
            console.log('User with address:', user);
            return user;
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
        },
        savePushToken: async function (
            userId: string,
            pushToken: string,
            appType: 'customer' | 'courier'
        ): Promise<void> {
            await db
                .insertInto('push_token')
                .values({ user_id: userId, token: pushToken, app_type: appType })
                .onConflict((oc) => oc.columns(['user_id', 'token']).doNothing())
                .execute();
        },
        updateUserProfile: async function (userId: string, profileData: Partial<UserRow>): Promise<UserRow> {
            const updatedUser = await db
                .updateTable('user')
                .set(profileData)
                .where('id', '=', userId)
                .returningAll()
                .executeTakeFirstOrThrow();

            return updatedUser;
        },
        updateUserById: async function (id: string, data: Partial<UpdateableUserRow>): Promise<UserRow> {
            console.log('Updating user with ID:', id, 'Data:', data);
            const updatedUser = await db
                .updateTable('user')
                .set(data)
                .where('id', '=', id)
                .returningAll()
                .executeTakeFirstOrThrow();

            return updatedUser;
        },
        associateAddressWithUser: async function (userId: string, addressId: number): Promise<void> {
            const customer = await db
                .selectFrom('customer')
                .where('user_id', '=', userId)
                .select('id')
                .executeTakeFirst();

            if (customer) {
                await db
                    .updateTable('customer')
                    .set({ address_id: addressId })
                    .where('id', '=', customer.id)
                    .execute();
            }
        }
    }
}
