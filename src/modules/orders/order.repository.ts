import { Kysely } from 'kysely';
import { Database } from '../../database';
import { InsertableOrderItemRow, InsertableOrderRow, OrderItemRow, OrderRow, OrderWithDetailsRow } from './order.table';
import { OrderItemData } from './order';
import { GetOrdersQuery } from './order.schema';

export interface OrdersRepository {
    createOrder(order: InsertableOrderRow): Promise<OrderRow>;
    createOrderItems(items: InsertableOrderItemRow[]): Promise<OrderItemRow[]>;
    findOrders(): Promise<OrderWithDetailsRow[]>;
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
        async findOrders(): Promise<OrderWithDetailsRow[]> {
            return await db
            .selectFrom('order')
            .innerJoin('customer', 'order.customer_id', 'customer.id')
            .innerJoin('user', 'customer.user_id', 'user.id')
            .innerJoin('address', 'customer.address_id', 'address.id')
            .innerJoin('street', 'address.street_id', 'street.id')
            .innerJoin('postal_code', 'address.postal_code_id', 'postal_code.id')
            .innerJoin('city', 'postal_code.city_id', 'city.id')
            .innerJoin('country', 'city.country_id', 'country.id')
            .leftJoin('order_item', 'order.id', 'order_item.order_id')
            .leftJoin('catalog_item', 'order_item.catalog_item_id', 'catalog_item.id')
            .leftJoin('payment', 'order.id', 'payment.order_id')
            .select([
              'order.id as order_id',
              'order.partner_id',
              'order.delivery_type',
              'order.status',
              'order.requested_delivery_time',
              'order.tip_amount',
              'order.note',
              'order.created_at',
              'order.updated_at',
              // User fields
              'user.first_name',
              'user.last_name',
              'user.email',
              'user.phone_number',
              // Address fields
              'country.name as country',
              'city.name as city',
              'street.name as street',
              'address.address_detail',
              'postal_code.code as postal_code',
              // Order item fields
              'order_item.catalog_item_id',
              'order_item.quantity',
              'order_item.note as item_note',
              'order_item.price',
              'catalog_item.name as item_name',
              // Payment fields
              'payment.payment_method'
            ])
            .execute();
        },
    };
};