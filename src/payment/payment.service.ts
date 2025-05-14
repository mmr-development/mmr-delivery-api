import { PaymentRepository } from './payment.repository';
import { PaymentRow, PaymentStatus, PaymentMethod } from './payment.table';

export interface PaymentService {
    createPayment(input: CreatePaymentInput): Promise<PaymentRow>;
    getPaymentByOrderId(order_id: number): Promise<PaymentRow | undefined>;
}

export function createPaymentService(repository: PaymentRepository): PaymentService {
    return {
        createPayment: repository.createPayment,
        getPaymentByOrderId: repository.getPaymentByOrderId,
    };
}

export interface CreatePaymentInput {
    order_id: number;
    payment_status: PaymentStatus;
    payment_method: PaymentMethod;
    transaction_id?: string | null;
    transaction_data?: Record<string, any>;
}