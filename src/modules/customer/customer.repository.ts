import { Kysely } from 'kysely';
import { Database } from '../../database';
import { CustomerRow, InsertableCustomerRow } from './customer.table';

export interface CustomerRepository {
    create(customer: InsertableCustomerRow): Promise<CustomerRow>;
    findById(id: number): Promise<CustomerRow | undefined>;
    findByUserId(user_id: string): Promise<CustomerRow | undefined>;
}

export function createCustomerRepository(db: Kysely<Database>): CustomerRepository {
    return {
        async create(customer: InsertableCustomerRow): Promise<CustomerRow> {
            const result = await db
                .insertInto('customer')
                .values(customer)
                .returningAll()
                .executeTakeFirstOrThrow();
            return result;
        },
        async findById(id: number): Promise<CustomerRow | undefined> {
            return db
                .selectFrom('customer')
                .selectAll()
                .where('id', '=', id)
                .executeTakeFirst();
        },
        async findByUserId(user_id: string): Promise<CustomerRow | undefined> {
            return db
                .selectFrom('customer')
                .selectAll()
                .where('user_id', '=', user_id)
                .executeTakeFirst();
        }
    };
}