import { Database } from '../../types/kysely.types';
import { Kysely, Transaction } from 'kysely';
import { InsertableUserRow, UserRow } from './user.table';

export interface UserRepository {
    insertUser(trx: Transaction<Database>, user: InsertableUserRow): Promise<UserRow>;
    findUserById(id: string): Promise<UserRow | undefined>;
    lockUserById(trx: Transaction<Database>, id: string): Promise<UserRow | undefined>;
    lockUserByEmail(trx: Transaction<Database>, email: string): Promise<UserRow | undefined>;
    lockUser(trx: Transaction<Database>, column: 'id' | 'email', value: string): Promise<UserRow | undefined>;
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
        findUserById: async function (id: string): Promise<UserRow | undefined> {
            const user = await db.selectFrom('user')
                .where('id', '=', id)
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
        }
    }
}