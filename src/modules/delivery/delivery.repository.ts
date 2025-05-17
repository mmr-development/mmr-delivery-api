import { Kysely, sql } from 'kysely';
import { Database } from '../../database';
import { 
    CourierAvailabilityRow, 
    CourierLocationRow, 
    DeliveryRow, 
    DeliveryWithOrderDetails, 
    InsertableCourierAvailabilityRow, 
    InsertableCourierLocationRow,
    InsertableDeliveryRow, 
    UpdateableCourierAvailabilityRow, 
    UpdateableDeliveryRow 
} from './delivery.tables';

export interface DeliveryRepository {
    createDelivery(delivery: InsertableDeliveryRow): Promise<DeliveryRow>;
    updateDelivery(deliveryId: number, data: UpdateableDeliveryRow): Promise<DeliveryRow>;
    getDeliveryById(deliveryId: number): Promise<DeliveryRow>;
    getDeliveriesForCourier(courierId: string): Promise<DeliveryRow[]>;
    getActiveDeliveries(): Promise<DeliveryWithOrderDetails[]>;
    updateCourierLocation(location: InsertableCourierLocationRow): Promise<CourierLocationRow>;
    getCourierLocation(courierId: string): Promise<CourierLocationRow | null>;
    getAvailableCouriers(): Promise<string[]>;
    updateCourierAvailability(data: InsertableCourierAvailabilityRow | UpdateableCourierAvailabilityRow): Promise<CourierAvailabilityRow>;
    getCourierAvailability(courierId: string): Promise<CourierAvailabilityRow | null>;
    getOrderDeliveryLocation(orderId: number): Promise<{ latitude: number, longitude: number } | null>;
    getCustomerDeliveryLocation(orderId: number): Promise<{ latitude: number, longitude: number } | null>;
    getAvailableCouriersWithLocations(): Promise<Array<{
        courier_id: string;
        latitude: number;
        longitude: number;
        last_updated: Date;
    }>>;
    getAvailableCouriersWithoutActiveDelivery(): Promise<string[]>;
    getCourierActiveDeliveryCount(courierId: string): Promise<number>;
}

export const createDeliveryRepository = (db: Kysely<Database>): DeliveryRepository => {
    return {
        async createDelivery(delivery: InsertableDeliveryRow): Promise<DeliveryRow> {
            return await db
                .insertInto('delivery')
                .values(delivery)
                .returningAll()
                .executeTakeFirstOrThrow();
        },

        async updateDelivery(deliveryId: number, data: UpdateableDeliveryRow): Promise<DeliveryRow> {
            return await db
                .updateTable('delivery')
                .set({
                    ...data,
                    updated_at: new Date()
                })
                .where('id', '=', deliveryId)
                .returningAll()
                .executeTakeFirstOrThrow();
        },

        async getDeliveryById(deliveryId: number): Promise<DeliveryRow> {
            return await db
                .selectFrom('delivery')
                .where('id', '=', deliveryId)
                .selectAll()
                .executeTakeFirstOrThrow();
        },

        async getDeliveriesForCourier(courierId: string): Promise<DeliveryRow[]> {
            return await db
                .selectFrom('delivery')
                .where('courier_id', '=', courierId)
                .selectAll()
                .execute();
        },

        async getActiveDeliveries(): Promise<DeliveryWithOrderDetails[]> {
            return await db
                .selectFrom('delivery as d')
                .innerJoin('order as o', 'o.id', 'd.order_id')
                .innerJoin('partner as p', 'p.id', 'o.partner_id')
                .innerJoin('address as pa', 'pa.id', 'p.address_id')
                .innerJoin('customer as c', 'c.id', 'o.customer_id')
                .innerJoin('address as ca', 'ca.id', 'c.address_id')
                .select([
                    'd.id as delivery_id',
                    'd.order_id',
                    'd.status',
                    'p.name as restaurant_name',
                    sql<string>`CONCAT(
                        (SELECT name FROM street WHERE id = pa.street_id), 
                        ', ', 
                        pa.address_detail
                    )`.as('restaurant_address'),
                    'pa.latitude as restaurant_latitude',
                    'pa.longitude as restaurant_longitude',
                    sql<string>`CONCAT(
                        (SELECT name FROM street WHERE id = ca.street_id), 
                        ', ', 
                        ca.address_detail
                    )`.as('customer_address'),
                    'ca.latitude as customer_latitude',
                    'ca.longitude as customer_longitude',
                    'd.estimated_delivery_time',
                    'd.created_at'
                ])
                .where('d.status', 'in', ['assigned', 'accepted', 'picked_up', 'in_transit'])
                .execute();
        },

        async updateCourierLocation(location: InsertableCourierLocationRow): Promise<CourierLocationRow> {
            return await db
                .insertInto('courier_location')
                .values({
                    ...location,
                    // Add small random variation for simulation (±100m)
                    latitude: location.latitude + (Math.random() * 0.002 - 0.001),
                    longitude: location.longitude + (Math.random() * 0.002 - 0.001)
                })
                .returningAll()
                .executeTakeFirstOrThrow();
        },

        async getCourierLocation(courierId: string): Promise<CourierLocationRow | null> {
            return await db
                .selectFrom('courier_location')
                .where('courier_id', '=', courierId)
                .selectAll()
                .orderBy('timestamp', 'desc')
                .limit(1)
                .executeTakeFirst();
        },

        async getAvailableCouriers(): Promise<string[]> {
            const results = await db
                .selectFrom('courier_availability')
                .select('courier_id')
                .where('is_available', '=', true)
                .where('is_working', '=', true)
                .execute();
            
            return results.map(row => row.courier_id);
        },

        async updateCourierAvailability(data: InsertableCourierAvailabilityRow | UpdateableCourierAvailabilityRow): Promise<CourierAvailabilityRow> {
            // Check if record exists
            const existing = await db
                .selectFrom('courier_availability')
                .where('courier_id', '=', data.courier_id)
                .selectAll()
                .executeTakeFirst();

            if (existing) {
                return await db
                    .updateTable('courier_availability')
                    .set({
                        ...data,
                        last_status_change: new Date(),
                        updated_at: new Date()
                    })
                    .where('courier_id', '=', data.courier_id)
                    .returningAll()
                    .executeTakeFirstOrThrow();
            } else {
                return await db
                    .insertInto('courier_availability')
                    .values({
                        ...data,
                        last_status_change: new Date(),
                        created_at: new Date(),
                        updated_at: new Date()
                    })
                    .returningAll()
                    .executeTakeFirstOrThrow();
            }
        },

        async getCourierAvailability(courierId: string): Promise<CourierAvailabilityRow | null> {
            return await db
                .selectFrom('courier_availability')
                .where('courier_id', '=', courierId)
                .selectAll()
                .executeTakeFirst();
        },

        async getOrderDeliveryLocation(orderId: number): Promise<{ latitude: number, longitude: number } | null> {
            const result = await db
                .selectFrom('order as o')
                .innerJoin('partner as p', 'p.id', 'o.partner_id')
                .innerJoin('address as a', 'a.id', 'p.address_id')
                .select(['a.latitude', 'a.longitude'])
                .where('o.id', '=', orderId)
                .executeTakeFirst();
            
            return result || null;
        },

        async getCustomerDeliveryLocation(orderId: number): Promise<{ latitude: number, longitude: number } | null> {
            const result = await db
                .selectFrom('order as o')
                .innerJoin('customer as c', 'c.id', 'o.customer_id')
                .innerJoin('address as a', 'a.id', 'c.address_id')
                .select(['a.latitude', 'a.longitude'])
                .where('o.id', '=', orderId)
                .executeTakeFirst();
            
            return result || null;
        },

        async getAvailableCouriersWithLocations(): Promise<Array<{
            courier_id: string;
            latitude: number;
            longitude: number;
            last_updated: Date;
        }>> {
            // Get the latest location for each available courier
            return await db
                .selectFrom('courier_availability as ca')
                .innerJoin(
                    // First get the most recent location for each courier
                    db.selectFrom('courier_location as cl')
                        .innerJoin(
                            // This subquery finds the latest timestamp per courier
                            db.selectFrom('courier_location')
                                .select([
                                    'courier_id',
                                    sql<string>`MAX(timestamp)`.as('max_timestamp')
                                ])
                                .groupBy('courier_id')
                                .as('latest'),
                            // Join on courier_id and matching timestamp
                            join => join.onRef('latest.courier_id', '=', 'cl.courier_id')
                                .onRef('latest.max_timestamp', '=', 'cl.timestamp')
                        )
                        .select([
                            'cl.courier_id',
                            'cl.latitude',
                            'cl.longitude',
                            'cl.timestamp as last_updated'
                        ])
                        .as('locations'),
                    join => join.onRef('ca.courier_id', '=', 'locations.courier_id')
                )
                .where('ca.is_available', '=', true)
                .where('ca.is_working', '=', true)
                .select([
                    'ca.courier_id',
                    'locations.latitude',
                    'locations.longitude',
                    'locations.last_updated'
                ])
                .execute();
        },

        async getAvailableCouriersWithoutActiveDelivery(): Promise<string[]> {
            // Get available couriers who aren't currently handling an active delivery
            const results = await db
                .selectFrom('courier_availability as ca')
                .leftJoin(
                    db.selectFrom('delivery as d')
                        .select(['courier_id', db.fn.count<number>('id').as('active_deliveries')])
                        .where('status', 'in', ['assigned', 'accepted', 'picked_up', 'in_transit'])
                        .groupBy('courier_id')
                        .as('active_deliveries'),
                    join => join.onRef('ca.courier_id', '=', 'active_deliveries.courier_id')
                )
                .select('ca.courier_id')
                .where('ca.is_available', '=', true)
                .where('ca.is_working', '=', true)
                .where(eb => eb('active_deliveries.active_deliveries', 'is', null)
                      .or('active_deliveries.active_deliveries', '=', 0))
                .execute();
            
            return results.map(row => row.courier_id);
        },

        async getCourierActiveDeliveryCount(courierId: string): Promise<number> {
            // Count how many active deliveries a courier currently has
            const result = await db
                .selectFrom('delivery')
                .select(({ fn }) => fn.count<number>('id').as('count'))
                .where('courier_id', '=', courierId)
                .where('status', 'in', ['assigned', 'accepted', 'picked_up', 'in_transit'])
                .executeTakeFirstOrThrow();
                
            return Number(result.count) || 0;
        }
    };
};
