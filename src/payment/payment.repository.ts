import { PaymentRow, PaymentStatus, PaymentMethod, InsertablePaymentRow } from './payment.table';
import { Kysely } from 'kysely';
import { Database } from '../database';


export interface PaymentRepository {
    createPayment(input: InsertablePaymentRow): Promise<PaymentRow>;
    getPaymentByOrderId(order_id: number): Promise<PaymentRow | undefined>;
}

export function createPaymentRepository(db: Kysely<Database>): PaymentRepository {
    return {
        async createPayment(input: InsertablePaymentRow): Promise<PaymentRow> {
            const [row] = await db
                .insertInto('payment')
                .values({
                    order_id: input.order_id,
                    payment_status: input.payment_status,
                    payment_method: input.payment_method,
                    transaction_id: input.transaction_id ?? null,
                    transaction_data: input.transaction_data ?? {},
                })
                .returningAll()
                .execute();
            return row;
        },
        async getPaymentByOrderId(order_id) {
            const row = await db
                .selectFrom('payment')
                .selectAll()
                .where('order_id', '=', order_id)
                .executeTakeFirst();
            return row;
        }
    };
}
