import { Kysely, sql } from 'kysely';
import { Database } from '../../database';
import { InsertableOrderItemRow, InsertableOrderRow, OrderItemRow, OrderRow, OrderWithDetailsRow } from './order.table';
import { GetOrdersQuery } from './order.schema';

export interface OrdersRepository {
    createOrder(order: InsertableOrderRow): Promise<OrderRow>;
    createOrderItems(items: InsertableOrderItemRow[]): Promise<OrderItemRow[]>;
    findOrders(query?: GetOrdersQuery): Promise<OrderWithDetailsRow[]>;
    countOrders(query?: GetOrdersQuery): Promise<number>;
}

export const createOrdersRepository = (db: Kysely<Database>): OrdersRepository => {
    return {
        async createOrder(order: InsertableOrderRow): Promise<OrderRow> {
            return await db
                .insertInto('order')
                .values(order)
                .returningAll()
                .executeTakeFirstOrThrow();
        },
        async createOrderItems(items: InsertableOrderItemRow[]): Promise<OrderItemRow[]> {
            return await db
                .insertInto('order_item')
                .values(items)
                .returningAll()
                .execute();
        },
        async findOrders(query?: GetOrdersQuery): Promise<OrderWithDetailsRow[]> {
            let queryBuilder = db
                .selectFrom('order as o')
                .innerJoin('customer as c', 'o.customer_id', 'c.id')
                .innerJoin('user as u', 'c.user_id', 'u.id')
                .innerJoin('address as a', 'c.address_id', 'a.id')
                .innerJoin('street as s', 'a.street_id', 's.id')
                .innerJoin('postal_code as pc', 'a.postal_code_id', 'pc.id')
                .innerJoin('city as ci', 'pc.city_id', 'ci.id')
                .innerJoin('country as co', 'ci.country_id', 'co.id')
                .leftJoin('order_item as oi', 'o.id', 'oi.order_id')
                .leftJoin('catalog_item as ci2', 'oi.catalog_item_id', 'ci2.id')
                .leftJoin('payment as p', 'o.id', 'p.order_id');

            if (query?.partner_id !== undefined) {
                queryBuilder = queryBuilder.where('o.partner_id', '=', query.partner_id);
            }

            if (query?.limit !== undefined) {
                queryBuilder = queryBuilder.limit(query.limit);
            }

            if (query?.offset !== undefined) {
                queryBuilder = queryBuilder.offset(query.offset);
            }

            if (query?.partner_id !== undefined) {
                queryBuilder = queryBuilder.where('o.partner_id', '=', query.partner_id);
            }

            if (query?.customer_id !== undefined) {
                queryBuilder = queryBuilder.where('o.customer_id', '=', query.customer_id);
            }

            const rawOrders = await queryBuilder
                .select(({ fn }) => [
                    'o.id as order_id',
                    'o.partner_id',
                    'o.delivery_type',
                    'o.status',
                    'o.requested_delivery_time',
                    'o.tip_amount',
                    'o.total_amount',
                    'o.note',
                    'o.created_at',
                    'o.updated_at',
                    'u.first_name',
                    'u.last_name',
                    'u.email',
                    'u.phone_number',
                    'co.name as country',
                    'ci.name as city',
                    's.name as street',
                    'a.address_detail',
                    'pc.code as postal_code',
                    sql`
                    array_agg(
                      json_build_object(
                        'catalog_item_id', oi.catalog_item_id,
                        'quantity', oi.quantity,
                        'item_note', oi.note,
                        'price', oi.price,
                        'item_name', ci2.name
                      )
                    )
                `.as('items'),
                    'p.payment_method',
                    fn.count<number>('oi.id').as('total_items'),
                ])
                .groupBy([
                    'o.id',
                    'o.partner_id',
                    'o.delivery_type',
                    'o.status',
                    'o.requested_delivery_time',
                    'o.tip_amount',
                    'o.note',
                    'o.created_at',
                    'o.updated_at',
                    'u.first_name',
                    'u.last_name',
                    'u.email',
                    'u.phone_number',
                    'co.name',
                    'ci.name',
                    's.name',
                    'a.address_detail',
                    'pc.code',
                    'p.payment_method'
                ])
                .orderBy('o.created_at', 'desc')
                .execute();

            return rawOrders.map(order => ({
                ...order,
                delivery_type: order.delivery_type as "pickup" | "delivery",
                status: order.status as "pending" | "failed" | "confirmed" | "preparing" | "ready" | "dispatched" | "delivered" | "cancelled" | "refunded",
                payment_method: order.payment_method as "credit_card" | "debit_card" | "paypal" | "mobile_pay",
                items: Array.isArray(order.items)
                    ? order.items.map((item: any) => ({
                        catalog_item_id: item.catalog_item_id,
                        quantity: item.quantity,
                        item_note: item.item_note,
                        price: item.price,
                        item_name: item.item_name,
                    }))
                    : [],
            }));
        },
        async countOrders(query?: GetOrdersQuery): Promise<number> {
            let countQuery = db
                .selectFrom('order as o')
                .select(({ fn }) => [fn.countAll<number>().as('count')]);

            if (query?.partner_id !== undefined) {
                countQuery = countQuery.where('o.partner_id', '=', query.partner_id);
            }

            if (query?.customer_id !== undefined) {
                countQuery = countQuery.where('o.customer_id', '=', query.customer_id);
            }

            const result = await countQuery.executeTakeFirstOrThrow();
            return Number(result.count);
        }
    };
};
