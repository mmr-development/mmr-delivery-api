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
                    'oi.note as item_note',
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
                    item_name: item.item_name || ''
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
                    fn.count<number>('o.id').as('total_items')
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
                        item_name: item.item_name || '' // Convert null to empty string
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
                .select(({ fn }) => [fn.countAll<number>().as('count')])
                .$if(query?.partner_id !== undefined, qb => 
                    qb.where('o.partner_id', '=', query!.partner_id!)
                )
                .$if(query?.customer_id !== undefined, qb => 
                    qb.where('o.customer_id', '=', query!.customer_id!)
                )
                .executeTakeFirstOrThrow();
                
            return Number(result.count);
        },
        
        async findOrdersReadyForDelivery(): Promise<OrderRow[]> {
            // Find orders that are ready for pickup but don't have a delivery record yet
            return await db
                .selectFrom('order as o')
                .leftJoin('delivery as d', 'o.id', 'd.order_id')
                .selectAll('o')  // Changed from .select('o.*') to .selectAll('o')
                .where('o.status', '=', 'ready_for_pickup')
                .where('o.delivery_type', '=', 'delivery') // Only orders for delivery
                .where('d.id', 'is', null) // No delivery record exists yet
                .execute();
        }
    };
};
