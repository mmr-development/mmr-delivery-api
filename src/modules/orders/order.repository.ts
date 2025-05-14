import { Kysely } from 'kysely';
import { Database } from '../../database';
import { InsertableOrderRow, OrderItemRow, OrderRow } from './order.table';
import { OrderItemData } from './order';

export interface OrdersRepository {
    createOrder(order: InsertableOrderRow): Promise<OrderRow>;
    createOrderItems(orderId: number, items: OrderItemData[]): Promise<OrderItemRow[]>;
    findOrders(options?: { offset?: number; limit?: number;}): Promise<{ orders: OrderRow[]; count: number }>;
}

export const createOrdersRepository = (db: Kysely<Database>): OrdersRepository => {
    return {
        async createOrder(order: InsertableOrderRow): Promise<OrderRow> {
            console.log('Creating order:', order);
            const result = await db
                .insertInto('order')
                .values(order)
                .returningAll()
                .executeTakeFirstOrThrow();

            return result;
        },
        async createOrderItems(orderId: number, items: OrderItemData[]): Promise<OrderItemRow[]> {
            const orderItems = items.map(item => ({
                order_id: orderId,
                catalog_item_id: item.catalog_item_id,
                quantity: item.quantity,
                price: item.price ?? 0,
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
        async findOrders(options?: {
            offset?: number;
            limit?: number;
        }): Promise<{ orders: (OrderRow & { items: OrderItemRow[] })[]; count: number }> {
            const offset = options?.offset ?? 0;
            const limit = options?.limit ?? null;
            // const filters = options?.filters ?? {};
        
            // Build base query
            let baseQuery = db.selectFrom('order');
        
            // if (filters.partner_id) baseQuery = baseQuery.where('partner_id', '=', filters.partner_id);
            // if (filters.customer_id) baseQuery = baseQuery.where('customer_id', '=', filters.customer_id);
            // if (filters.status) baseQuery = baseQuery.where('order_status', '=', filters.status);
            // if (filters.date_from) baseQuery = baseQuery.where('created_at', '>=', filters.date_from);
            // if (filters.date_to) baseQuery = baseQuery.where('created_at', '<=', filters.date_to);
        
            // Get count
            const { count } = await baseQuery
                .select((eb) => eb.fn.countAll().as('count'))
                .executeTakeFirstOrThrow();
        
            // Get orders
            let query = baseQuery
                .selectAll('order')
                .orderBy('id')
                .offset(offset);
        
            if (limit !== null) query = query.limit(limit);
        
            const orders = await query.execute();
        
            // Fetch order items for these orders
            const orderIds = orders.map(o => o.id);
            let orderItems: OrderItemRow[] = [];
            if (orderIds.length > 0) {
                orderItems = await db
                    .selectFrom('order_item')
                    .where('order_id', 'in', orderIds)
                    .selectAll()
                    .execute();
            }
        
            // Map items to orders
            const itemsMap = new Map<number, OrderItemRow[]>();
            for (const item of orderItems) {
                if (!itemsMap.has(item.order_id)) itemsMap.set(item.order_id, []);
                itemsMap.get(item.order_id)!.push(item);
            }
        
            const ordersWithItems = orders.map(o => ({
                ...o,
                items: itemsMap.get(o.id) ?? []
            }));
        
            return {
                orders: ordersWithItems,
                count: Number(count)
            };
        }
    };
};