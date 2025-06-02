import { Kysely, sql } from 'kysely';
import { jsonArrayFrom } from 'kysely/helpers/postgres';
import { Database } from '../../database';
import {
    InsertableOrderItemRow,
    InsertableOrderRow,
    OrderItemRow,
    OrderRow,
    OrderWithDetailsRow,
    UpdateableOrderRow,
    OrderSummary,
    OrderWithItems,
    OrderWithCustomer,
    OrderWithAddress,
    OrderWithPayment
} from './order.table';
import { GetOrdersQuery } from './order.schema';

export interface OrdersRepository {
    createOrder(order: InsertableOrderRow): Promise<OrderRow>;
    createOrderItems(items: InsertableOrderItemRow[]): Promise<OrderItemRow[]>;
    findOrders(query?: GetOrdersQuery): Promise<OrderWithDetailsRow[]>;
    findOrderSummaries(query?: GetOrdersQuery): Promise<OrderSummary[]>;
    findOrdersWithItems(query?: GetOrdersQuery): Promise<OrderWithItems[]>;
    findOrdersWithCustomer(query?: GetOrdersQuery): Promise<OrderWithCustomer[]>;
    findOrdersWithAddress(query?: GetOrdersQuery): Promise<OrderWithAddress[]>;
    findOrdersWithPayment(query?: GetOrdersQuery): Promise<OrderWithPayment[]>;
    findOrderById(orderId: number): Promise<OrderRow>;
    updateOrder(orderId: number, orderData: UpdateableOrderRow): Promise<OrderRow>;
    getMostPurchasedItems(limit: number): Promise<OrderItemRow[]>;
    countOrders(query?: GetOrdersQuery): Promise<number>;
    findOrdersReadyForDelivery(): Promise<OrderRow[]>;
    getOrderAddressDetails(orderId: number): Promise<any>;
    getPartnerById(partnerId: number): Promise<any>;
    findOrdersByPartnerId(partnerId: number): Promise<OrderRow[]>;
    findLatestOrderByPartnerId(partnerId: number): Promise<OrderRow[] | null>;
    getOrderCustomerEmail(orderId: number): Promise<string | null>;
    getOrderWithCustomerDetails(orderId: number): Promise<any | null>;
    getOrderStatistics(partnerId?: number, options?: { startDate?: Date, endDate?:Date}): Promise<any>;
}

export const createOrdersRepository = (db: Kysely<Database>): OrdersRepository => {
    // Helper function to get order items
    const getOrderItems = (orderId: number | any) => {
        return jsonArrayFrom(
            db.selectFrom('order_item as oi')
                .leftJoin('catalog_item as ci', 'oi.catalog_item_id', 'ci.id')
                .select([
                    'oi.catalog_item_id',
                    'oi.quantity',
                    'oi.note',
                    'oi.price',
                    'ci.name as item_name'
                ])
                .where('oi.order_id', '=', orderId)
        );
    };

    // Helper to apply common query filters
    const applyCommonFilters = (queryBuilder: any, query?: GetOrdersQuery) => {
        return queryBuilder
            .$if(query?.partner_id !== undefined, qb =>
                qb.where('o.partner_id', '=', query!.partner_id!)
            )
            .$if(query?.customer_id !== undefined, qb =>
                qb.where('o.customer_id', '=', query!.customer_id!)
            )
            .$if(query?.limit !== undefined, qb =>
                qb.limit(query!.limit!)
            )
            .$if(query?.offset !== undefined, qb =>
                qb.offset(query!.offset!)
            );
    };

    // Helper to select basic order fields
    const selectBasicOrderFields = () => [
        'o.id as order_id',
        'o.partner_id',
        'o.delivery_type',
        'o.status',
        'o.requested_delivery_time',
        'o.tip_amount',
        'o.total_amount',
        'o.note',
        'o.created_at',
        'o.updated_at'
    ];

    // Helper to format order results
    const formatOrderResult = (order: any) => ({
        ...order,
        delivery_type: order.delivery_type as "pickup" | "delivery",
        status: order.status as "pending" | "failed" | "confirmed" | "preparing" | "ready" | "dispatched" | "delivered" | "cancelled" | "refunded"
    });

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

        async findOrderSummaries(query?: GetOrdersQuery): Promise<OrderSummary[]> {
            return await applyCommonFilters(
                db.selectFrom('order as o')
                    .select([
                        ...selectBasicOrderFields(),
                        ({ fn }) => fn.count<number>('o.id').as('total_items')
                    ]),
                query
            )
                .groupBy(selectBasicOrderFields())
                .orderBy('o.created_at', 'desc')
                .execute()
                .then(orders => orders.map(formatOrderResult));
        },

        async findOrdersWithItems(query?: GetOrdersQuery): Promise<OrderWithItems[]> {
            return await applyCommonFilters(
                db.selectFrom('order as o')
                    .select(({ ref, fn }) => [
                        ...selectBasicOrderFields(),
                        fn.count<number>('o.id').as('total_items'),
                        getOrderItems(ref('o.id')).as('items')
                    ]),
                query
            )
                .groupBy(selectBasicOrderFields())
                .orderBy('o.created_at', 'desc')
                .execute()
                .then(orders => orders.map(order => ({
                    ...formatOrderResult(order),
                    items: (order.items || []).map((item: any) => ({
                        ...item,
                        item_name: item.item_name || '',
                        note: item.note || ''
                    }))
                })));
        },

        async findOrdersWithCustomer(query?: GetOrdersQuery): Promise<OrderWithCustomer[]> {
            return await applyCommonFilters(
                db.selectFrom('order as o')
                    .innerJoin('customer as c', 'o.customer_id', 'c.id')
                    .innerJoin('user as u', 'c.user_id', 'u.id')
                    .select(({ fn }) => [
                        ...selectBasicOrderFields(),
                        'u.first_name',
                        'u.last_name',
                        'u.email',
                        'u.phone_number',
                        fn.count<number>('o.id').as('total_items')
                    ]),
                query
            )
                .groupBy([
                    ...selectBasicOrderFields(),
                    'u.first_name',
                    'u.last_name',
                    'u.email',
                    'u.phone_number'
                ])
                .orderBy('o.created_at', 'desc')
                .execute()
                .then(orders => orders.map(formatOrderResult));
        },

        async findOrdersWithAddress(query?: GetOrdersQuery): Promise<OrderWithAddress[]> {
            return await applyCommonFilters(
                db.selectFrom('order as o')
                    .innerJoin('customer as c', 'o.customer_id', 'c.id')
                    .innerJoin('address as a', 'c.address_id', 'a.id')
                    .innerJoin('street as s', 'a.street_id', 's.id')
                    .innerJoin('postal_code as pc', 'a.postal_code_id', 'pc.id')
                    .innerJoin('city as ci', 'pc.city_id', 'ci.id')
                    .innerJoin('country as co', 'ci.country_id', 'co.id')
                    .select(({ fn }) => [
                        ...selectBasicOrderFields(),
                        'co.name as country',
                        'ci.name as city',
                        's.name as street',
                        'a.address_detail',
                        'pc.code as postal_code',
                        fn.count<number>('o.id').as('total_items')
                    ]),
                query
            )
                .groupBy([
                    ...selectBasicOrderFields(),
                    'co.name',
                    'ci.name',
                    's.name',
                    'a.address_detail',
                    'pc.code'
                ])
                .orderBy('o.created_at', 'desc')
                .execute()
                .then(orders => orders.map(formatOrderResult));
        },

        async findOrdersWithPayment(query?: GetOrdersQuery): Promise<OrderWithPayment[]> {
            return await applyCommonFilters(
                db.selectFrom('order as o')
                    .leftJoin('payment as p', 'o.id', 'p.order_id')
                    .select(({ fn }) => [
                        ...selectBasicOrderFields(),
                        'p.payment_method',
                        fn.count<number>('o.id').as('total_items')
                    ]),
                query
            )
                .groupBy([
                    ...selectBasicOrderFields(),
                    'p.payment_method'
                ])
                .orderBy('o.created_at', 'desc')
                .execute()
                .then(orders => orders.map(order => ({
                    ...formatOrderResult(order),
                    payment_method: order.payment_method as "credit_card" | "debit_card" | "paypal" | "mobile_pay"
                })));
        },

        async findOrders(query?: GetOrdersQuery): Promise<OrderWithDetailsRow[]> {
            return await db
                .selectFrom('order as o')
                .innerJoin('customer as c', 'o.customer_id', 'c.id')
                .innerJoin('user as u', 'c.user_id', 'u.id')
                .innerJoin('address as a', 'c.address_id', 'a.id')
                .innerJoin('street as s', 'a.street_id', 's.id')
                .innerJoin('postal_code as pc', 'a.postal_code_id', 'pc.id')
                .innerJoin('city as ci', 'pc.city_id', 'ci.id')
                .innerJoin('country as co', 'ci.country_id', 'co.id')
                .leftJoin('payment as p', 'o.id', 'p.order_id')
                .$if(query?.partner_id !== undefined, qb =>
                    qb.where('o.partner_id', '=', query!.partner_id!)
                )
                .$if(query?.customer_id !== undefined, qb =>
                    qb.where('o.customer_id', '=', query!.customer_id!)
                )
                .$if(query?.limit !== undefined, qb =>
                    qb.limit(query!.limit!)
                )
                .$if(query?.offset !== undefined, qb =>
                    qb.offset(query!.offset!)
                )
                .$if(query?.user_id !== undefined, qb =>
                    qb.where('c.user_id', '=', query!.user_id!)
                )
                .select(({ ref, fn }) => [
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
                    'p.payment_method',
                    getOrderItems(ref('o.id')).as('items'),
                    sql<number>`(SELECT COALESCE(SUM(quantity), 0) FROM order_item WHERE order_id = o.id)`.as('total_items')
                ])
                .groupBy([
                    'o.id',
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
                    'co.name',
                    'ci.name',
                    's.name',
                    'a.address_detail',
                    'pc.code',
                    'p.payment_method'
                ])
                .orderBy('o.created_at', 'desc')
                .execute()
                .then(orders => orders.map(order => ({
                    ...order,
                    delivery_type: order.delivery_type as "pickup" | "delivery",
                    status: order.status as "pending" | "failed" | "confirmed" | "preparing" | "ready" | "dispatched" | "delivered" | "cancelled" | "refunded",
                    payment_method: order.payment_method as "credit_card" | "debit_card" | "paypal" | "mobile_pay",
                    items: (order.items || []).map(item => ({
                        ...item,
                        item_name: item.item_name || '', // Convert null to empty string
                        note: item.note || ''
                    }))
                })));
        },

        async updateOrder(orderId: number, orderData: UpdateableOrderRow): Promise<OrderRow> {
            return await db
                .updateTable('order')
                .set(orderData)
                .where('id', '=', orderId)
                .returningAll()
                .executeTakeFirstOrThrow();
        },

        async findOrderById(orderId: number): Promise<OrderRow> {
            return await db
                .selectFrom('order')
                .selectAll()
                .where('id', '=', orderId)
                .executeTakeFirstOrThrow();
        },

        async getMostPurchasedItems(limit: number): Promise<OrderItemRow[]> {
            return await db
                .selectFrom('order_item as oi')
                .innerJoin('order as o', 'oi.order_id', 'o.id')
                .select([
                    'oi.catalog_item_id',
                    sql<number>`SUM(oi.quantity)`.as('purchase_count')
                ])
                .groupBy('oi.catalog_item_id')
                .orderBy('purchase_count', 'desc')
                .limit(limit)
                .execute();
        },

        async countOrders(query?: GetOrdersQuery): Promise<number> {
            const result = await db
                .selectFrom('order as o')
                .innerJoin('customer as c', 'o.customer_id', 'c.id')
                .select(({ fn }) => [fn.countAll<number>().as('count')])
                .$if(query?.partner_id !== undefined, qb =>
                    qb.where('o.partner_id', '=', query!.partner_id!)
                )
                .$if(query?.customer_id !== undefined, qb =>
                    qb.where('o.customer_id', '=', query!.customer_id!)
                )
                .$if(query?.user_id !== undefined, qb =>
                    qb.where('c.user_id', '=', query!.user_id!)
                )
                .executeTakeFirstOrThrow();

            return Number(result.count);
        },

        async findOrdersReadyForDelivery(): Promise<OrderRow[]> {
            // Find orders that are ready but don't have a delivery record yet
            return await db
                .selectFrom('order as o')
                .leftJoin('delivery as d', 'o.id', 'd.order_id')
                .selectAll('o')
                .where(qb => qb
                    .where('o.status', '=', 'ready')
                    .or('o.status', '=', 'confirmed')
                )
                .where('o.delivery_type', '=', 'delivery') // Only orders for delivery
                .where('d.id', 'is', null) // No delivery record exists yet
                .execute();
        },

        async getOrderAddressDetails(orderId: number): Promise<any> {
            return await db
                .selectFrom('order as o')
                .innerJoin('customer as c', 'o.customer_id', 'c.id')
                .innerJoin('user as u', 'c.user_id', 'u.id')
                .innerJoin('address as a', 'c.address_id', 'a.id')
                .innerJoin('street as s', 'a.street_id', 's.id')
                .innerJoin('postal_code as pc', 'a.postal_code_id', 'pc.id')
                .innerJoin('city as ci', 'pc.city_id', 'ci.id')
                .innerJoin('country as co', 'ci.country_id', 'co.id')
                .select([
                    'u.first_name',
                    'u.last_name',
                    'u.phone_number',
                    'co.name as country',
                    'ci.name as city',
                    's.name as street',
                    'pc.code as postal_code',
                    'a.address_detail',
                    'a.latitude',
                    'a.longitude'
                ])
                .where('o.id', '=', orderId)
                .executeTakeFirst();
        },

        async getPartnerById(partnerId: number): Promise<any> {
            return await db
                .selectFrom('partner as p')
                .innerJoin('address as a', 'p.address_id', 'a.id')
                .innerJoin('street as s', 'a.street_id', 's.id')
                .innerJoin('postal_code as pc', 'a.postal_code_id', 'pc.id')
                .innerJoin('city as ci', 'pc.city_id', 'ci.id')
                .innerJoin('country as co', 'ci.country_id', 'co.id')
                .select([
                    'p.id',
                    'p.name',
                    'p.logo_url',
                    'co.name as country',
                    'ci.name as city',
                    's.name as street',
                    'pc.code as postal_code',
                    'a.address_detail',
                    'a.latitude',
                    'a.longitude',
                    'p.max_delivery_distance_km',
                ])
                .where('p.id', '=', partnerId)
                .executeTakeFirst();
        },
        findOrdersByPartnerId: async (partnerId: number): Promise<any[]> => {
            const orders = await sql`
        SELECT
            o.id,
            o.partner_id,
            o.status,
            o.delivery_type,
            o.requested_delivery_time,
            o.note,
            o.total_amount,
            o.tip_amount,
            (
                SELECT json_agg(
                    json_build_object(
                        'quantity', oi.quantity,
                        'price', oi.price,
                        'note', oi.note,
                        'name', ci.name,
                        'description', ci.description
                    )
                )
                FROM order_item oi
                INNER JOIN catalog_item ci ON oi.catalog_item_id = ci.id
                WHERE oi.order_id = o.id
            ) AS items,
            (
                SELECT COALESCE(SUM(oi.quantity), 0)
                FROM order_item oi
                WHERE oi.order_id = o.id
            ) AS total_quantity
        FROM "order" o
        WHERE o.partner_id = ${partnerId}
          AND o.status IN ('pending', 'confirmed', 'preparing', 'ready');
    `.execute(db)
            console.log('Orders from partner:', orders);
            return orders.rows;
        },
        findLatestOrderByPartnerId: async (partnerId: number): Promise<any | null> => {
            const result = await sql`
        SELECT
            o.id,
            o.partner_id,
            o.status,
            o.delivery_type,
            o.requested_delivery_time,
            o.note,
            o.total_amount,
            o.tip_amount,
            (
                SELECT json_agg(
                    json_build_object(
                        'quantity', oi.quantity,
                        'price', oi.price,
                        'note', oi.note,
                        'name', ci.name,
                        'description', ci.description
                    )
                )
                FROM order_item oi
                INNER JOIN catalog_item ci ON oi.catalog_item_id = ci.id
                WHERE oi.order_id = o.id
            ) AS items,
            (
                SELECT COALESCE(SUM(oi.quantity), 0)
                FROM order_item oi
                WHERE oi.order_id = o.id
            ) AS total_quantity
        FROM "order" o
        WHERE o.partner_id = ${partnerId}
          AND o.status IN ('pending', 'confirmed', 'preparing', 'ready')
        ORDER BY o.created_at DESC
        LIMIT 1
    `.execute(db);

            return result.rows;
        },
    async getOrderCustomerEmail(orderId: number): Promise<string | null> {
        const result = await db
            .selectFrom('order as o')
            .innerJoin('customer as c', 'o.customer_id', 'c.id')
            .innerJoin('user as u', 'c.user_id', 'u.id')
            .select('u.email')
            .where('o.id', '=', orderId)
            .executeTakeFirst();
            
        return result?.email ?? null;
    },
    async getOrderWithCustomerDetails(orderId: number): Promise<any | null> {
        console.log(`Fetching order with ID: ${orderId}`);
        const result = await db
            .selectFrom('order as o')
            .innerJoin('customer as c', 'o.customer_id', 'c.id')
            .innerJoin('user as u', 'c.user_id', 'u.id')
            .innerJoin('address as a', 'c.address_id', 'a.id')
            .innerJoin('street as s', 'a.street_id', 's.id')
            .innerJoin('postal_code as pc', 'a.postal_code_id', 'pc.id')
            .innerJoin('city as ci', 'pc.city_id', 'ci.id')
            .innerJoin('country as co', 'ci.country_id', 'co.id')
            .leftJoin('payment as p', 'o.id', 'p.order_id')
            .leftJoin('partner as par', 'o.partner_id', 'par.id')
            .select(({ ref }) => [
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
                'p.payment_method',
                'par.name as partner_name',
                'par.phone_number as partner_phone_number',
                'par.delivery_fee as delivery_fee',
                jsonArrayFrom(
                    db.selectFrom('order_item as oi')
                        .leftJoin('catalog_item as ci', 'oi.catalog_item_id', 'ci.id')
                        .select([
                            'oi.catalog_item_id',
                            'oi.quantity',
                            'oi.note',
                            'oi.price',
                            'ci.name as item_name'
                        ])
                        .where('oi.order_id', '=', ref('o.id'))
                ).as('items')
            ])
            .where('o.id', '=', orderId)
            .executeTakeFirst();

        console.log('Order with customer details:', result);

        return result ?? null;
    },  
    async getOrderStatistics(partnerId?: number, options?: { startDate?: Date, endDate?: Date }): Promise<any> {
        let query = db
            .selectFrom('order as o')
            .select([
                sql<number>`COUNT(*)`.as('total_orders'),
                sql<number>`COALESCE(SUM(o.total_amount), 0)`.as('total_revenue'),
                sql<number>`COALESCE(SUM(o.tip_amount), 0)`.as('total_tips'),
                sql<number>`COALESCE(SUM(o.total_amount - COALESCE(o.tip_amount,0)), 0)`.as('total_without_tips')
            ])
            .where('o.status', 'in', ['confirmed', 'preparing', 'ready', 'dispatched', 'delivered']);

        if (partnerId !== undefined) {
            query = query.where('o.partner_id', '=', partnerId);
        }
        if (options?.startDate) {
            query = query.where('o.created_at', '>=', options.startDate);
        }
        if (options?.endDate) {
            query = query.where('o.created_at', '<=', options.endDate);
        }

        const stats = await query.executeTakeFirst();

        // Per-day statistics
        let perDayQuery = db
            .selectFrom('order as o')
            .select([
                sql`DATE(o.created_at)`.as('date'),
                sql<number>`COUNT(*)`.as('orders'),
                sql<number>`COALESCE(SUM(o.total_amount), 0)`.as('revenue'),
                sql<number>`COALESCE(SUM(o.tip_amount), 0)`.as('tips')
            ])
            .where('o.status', 'in', ['confirmed', 'preparing', 'ready', 'dispatched', 'delivered']);

        if (partnerId !== undefined) {
            perDayQuery = perDayQuery.where('o.partner_id', '=', partnerId);
        }
        if (options?.startDate) {
            perDayQuery = perDayQuery.where('o.created_at', '>=', options.startDate);
        }
        if (options?.endDate) {
            perDayQuery = perDayQuery.where('o.created_at', '<=', options.endDate);
        }

        const perDayStats = await perDayQuery
            .groupBy(sql`DATE(o.created_at)`)
            .orderBy(sql`DATE(o.created_at)`)
            .execute();

        // Map per-day stats to arrays
        const ordersPerDay = perDayStats.map(row => ({
            date: row.date,
            orders: Number(row.orders)
        }));
        const revenuePerDay = perDayStats.map(row => ({
            date: row.date,
            revenue: Number(row.revenue)
        }));
        const tipsPerDay = perDayStats.map(row => ({
            date: row.date,
            tips: Number(row.tips)
        }));

        return {
            totalOrders: Number(stats?.total_orders ?? 0),
            totalRevenue: Number(stats?.total_revenue ?? 0),
            totalTips: Number(stats?.total_tips ?? 0),
            totalWithoutTips: Number(stats?.total_without_tips ?? 0),
            ordersPerDay,
            revenuePerDay,
            tipsPerDay
        };
    },
    };
};
