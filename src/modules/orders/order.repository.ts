import { Kysely } from 'kysely';
import { Database } from '../../database';
import { CreateOrderRequest, OrderResponse, UpdateOrderRequest } from './order.schema';
import { InsertableOrderRow, OrderItemRow, OrderRow } from './order.table';
import { OrderItemData } from './order';

export interface OrdersRepository {
    createOrder(order: InsertableOrderRow): Promise<OrderRow>;
    createOrderItems(orderId: number, items: OrderItemData[]): Promise<OrderItemRow[]>;
}

export const createOrdersRepository = (db: Kysely<Database>): OrdersRepository => {
    return {
        async createOrder(order: InsertableOrderRow): Promise<OrderRow> {
            const result = await db
                .insertInto('order')
                .values(order)
                .returningAll()
                .executeTakeFirstOrThrow();

            return {
                id: result.id,
                partner_id: result.partner_id,
                customer_id: result.customer_id,
                order_status: result.order_status,
                delivery_type: result.delivery_type,
                requested_delivery_time: result.requested_delivery_time,
                tip_amount: result.tip_amount,
                customer_note: result.customer_note,
                total_amount: result.total_amount,
                created_at: result.created_at,
                updated_at: result.updated_at,
            };
        },
        async createOrderItems(orderId: number, items: OrderItemData[]): Promise<OrderItemRow[]> {
            const orderItems = items.map(item => ({
                order_id: orderId,
                catalog_item_id: item.catalog_item_id,
                quantity: item.quantity,
                price: item.price,
                note: item.note ?? null,
            }));

            const result = await db
                .insertInto('order_item')
                .values(orderItems)
                .returningAll()
                .execute();

            return result.map(item => ({
                id: item.id,
                order_id: item.order_id,
                catalog_item_id: item.catalog_item_id,
                quantity: item.quantity,
                price: item.price,
                note: item.note ?? null,
                created_at: item.created_at,
                updated_at: item.updated_at,
            }));
        },
    };
};