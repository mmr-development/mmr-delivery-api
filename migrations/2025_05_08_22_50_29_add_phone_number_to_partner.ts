import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema.alterTable('partner')
        .addColumn('phone_number', 'varchar(50)', (col) => col.notNull().defaultTo(''))
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.alterTable('partner')
        .dropColumn('phone_number')
        .execute();
}
