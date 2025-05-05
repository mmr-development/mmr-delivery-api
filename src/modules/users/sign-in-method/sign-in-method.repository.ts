import { Kysely, Transaction } from 'kysely';
import { Database } from '../../../database';
import { InsertablePasswordSignInMethodRow, PasswordSignInMethodRow, UpdateablePasswordSignInMethodRow } from './password-sign-in-method.table'

export interface SignInMethodRepository {
    insertPasswordSignInMethod: (trx: Transaction<Database>, method: InsertablePasswordSignInMethodRow) => Promise<PasswordSignInMethodRow>
    findPasswordSignInMethod: (trx: Transaction<Database>, userId: string) => Promise<PasswordSignInMethodRow | undefined>
    updatePasswordSignInMethod: (trx: Transaction<Database>, userId: string, updates: UpdateablePasswordSignInMethodRow) => Promise<void>
}

export function createSignInMethodRepository(db: Kysely<Database>): SignInMethodRepository {
    return {
        insertPasswordSignInMethod: async function (trx: Transaction<Database>, method: InsertablePasswordSignInMethodRow): Promise<PasswordSignInMethodRow> {
            await trx
                .with('sim', (db) =>
                    db
                        .insertInto('sign_in_method')
                        .values({ user_id: method.user_id, type: 'password' })
                )
                .insertInto('password_sign_in_method')
                .values(method)
                .execute()

            return method
        },
        findPasswordSignInMethod: async function (trx: Transaction<Database>, userId: string): Promise<PasswordSignInMethodRow | undefined> {
            const method = await trx
                .selectFrom('sign_in_method as sim')
                .innerJoin('password_sign_in_method as psim', 'psim.user_id', 'sim.user_id')
                .selectAll('psim')
                .where('sim.type', '=', 'password')
                .where('sim.user_id', '=', userId)
                .executeTakeFirst()

            return method
        },
        updatePasswordSignInMethod: async function (trx: Transaction<Database>, userId: string, updates: UpdateablePasswordSignInMethodRow): Promise<void> {
            await trx.updateTable('password_sign_in_method')
                .set({ password_hash: updates.password_hash })
                .where('user_id', '=', userId)
                .execute()
        }
    }
}
