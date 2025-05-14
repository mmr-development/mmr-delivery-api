// import { Kysely, sql } from 'kysely';

// export async function up(db: Kysely<any>): Promise<void> {
//     await db.schema
//         .createType('delivery_status')
//         .asEnum([
//             'assigned',
//             'picked_up',
//             'in_transit',
//             'delivered',
//             'failed',
//             'canceled'
//         ])
//         .execute();

//     await db.schema.createTable('delivery')
//         .addColumn('id', 'serial', col => col.primaryKey())
//         .addColumn('order_id', 'integer', col => col.notNull().references('order.id').onDelete('cascade'))
//         .addColumn('courier_id', 'uuid', col => col.notNull().references('user.id').onDelete('cascade'))
//         .addColumn('status', sql`delivery_status`, col => col.notNull().defaultTo('assigned'))
//         .addColumn('timestamp', 'timestamp', col => col.notNull().defaultTo(sql`now()`))
//         .execute();
// }

// export async function down(db: Kysely<any>): Promise<void> {
//     await db.schema.dropTable('delivery').execute();
//     await db.schema.dropType('delivery_status').execute();
// }
