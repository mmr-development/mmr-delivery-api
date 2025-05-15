import { Generated, Insertable, Selectable, Updateable } from 'kysely';


export type PaymentStatus = 'pending' | 'completed' | 'failed';
export type PaymentMethod = 'credit_card' | 'debit_card' | 'paypal' | 'mobile_pay' | 'unknown';

export interface PaymentTable {
    id: Generated<number>;
    order_id: number;
    payment_status: PaymentStatus;
    payment_method: PaymentMethod;
    transaction_id: string | null;
    transaction_data: Record<string, any>;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export type PaymentRow = Selectable<PaymentTable>;
export type InsertablePaymentRow = Insertable<PaymentTable>;
export type UpdateablePaymentRow = Updateable<PaymentTable>;
