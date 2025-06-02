import { Kysely, Transaction, sql } from 'kysely';
import { Database } from '../../database';
import { CourierLocationRow, DeliveryRow, DeliveryStatus, UpdateableDeliveryRow } from './delivery.types';
import { DetailedDelivery } from './delivery.service';

export interface DeliveryRepository {
  createDelivery(delivery: Omit<DeliveryRow, 'id' | 'created_at' | 'updated_at' | 'assigned_at'>): Promise<DeliveryRow>;
  findDeliveryById(id: number): Promise<DeliveryRow | undefined>;
  findDeliveryByOrderId(orderId: number): Promise<DeliveryRow | undefined>;
  findDetailedDeliveriesByCourier(courierId: string): Promise<DetailedDelivery[]>;
  updateDeliveryStatus(id: number, status: DeliveryStatus): Promise<DeliveryRow>;
  updateCourierLocation(locationData: Omit<CourierLocationRow, 'id' | 'timestamp'>): Promise<CourierLocationRow>;
  getAvailableCouriers(): Promise<{ courier_id: string, active_deliveries: number }[]>;
  findOrdersReadyForDelivery(limit?: number): Promise<any[]>;
  transaction<T>(callback: (trx: DeliveryRepository) => Promise<T>): Promise<T>;
  directUpdateDeliveryStatus(id: number, status: DeliveryStatus): Promise<DeliveryRow>;
  updateProofOfDelivery(deliveryId: number, proofOfDeliveryImage: string): Promise<void>;
}

export const createDeliveryRepository = (db: Kysely<Database>): DeliveryRepository => {
  const getStatusTimestampFields = (status: DeliveryStatus): Record<string, any> => {
    const updateData: Record<string, any> = {
      status,
      updated_at: new Date()
    };

    if (status === 'picked_up') {
      updateData.picked_up_at = new Date();
    } else if (status === 'delivered') {
      updateData.delivered_at = new Date();
    }

    return updateData;
  };

  const createRepositoryWithDB = (dbOrTrx: Kysely<Database> | Transaction<Database>): DeliveryRepository => {
    return {
      async createDelivery(delivery): Promise<DeliveryRow> {
        try {
          console.log(`Creating delivery for order ${delivery.order_id} assigned to courier ${delivery.courier_id}`);
          const result = await dbOrTrx
            .insertInto('delivery')
            .values(delivery)
            .returningAll()
            .executeTakeFirstOrThrow();
          console.log(`Successfully created delivery #${result.id}`);
          return result;
        } catch (error) {
          console.error(`Error creating delivery:`, error);
          throw error;
        }
      },

      async findDeliveryById(id, selectFields = ['*']): Promise<DeliveryRow | undefined> {
        try {
          return await dbOrTrx
            .selectFrom('delivery')
            .selectAll()
            .where('id', '=', id)
            .executeTakeFirst();
        } catch (error) {
          console.error(`Error in findDeliveryById(${id}):`, error);
          throw error;
        }
      },

async findDetailedDeliveriesByCourier(courierId: string): Promise<DetailedDelivery[]> {
  return await dbOrTrx
    .selectFrom('delivery as d')
    .leftJoin('order as o', 'o.id', 'd.order_id')
    .leftJoin('partner as p', 'p.id', 'o.partner_id')
    .leftJoin('address as pa', 'pa.id', 'p.address_id')
    .leftJoin('street as ps', 'ps.id', 'pa.street_id')
    .leftJoin('postal_code as ppc', 'ppc.id', 'pa.postal_code_id')
    .leftJoin('city as pc', 'pc.id', 'ppc.city_id')
    .leftJoin('country as pcn', 'pcn.id', 'pc.country_id')
    .leftJoin('customer as c', 'c.id', 'o.customer_id')
    .leftJoin('user as u', 'u.id', 'c.user_id')
    .leftJoin('address as ca', 'ca.id', 'c.address_id')
    .leftJoin('street as cs', 'cs.id', 'ca.street_id')
    .leftJoin('postal_code as cpc', 'cpc.id', 'ca.postal_code_id')
    .leftJoin('city as cc', 'cc.id', 'cpc.city_id')
    .leftJoin('country as ccn', 'ccn.id', 'cc.country_id')
    .select([
      'd.id',
      'd.order_id',
      'd.courier_id',
      'd.status',
      'd.assigned_at',
      'd.picked_up_at',
      'd.delivered_at',
      'd.estimated_delivery_time',
      'd.created_at',
      'd.updated_at',
      sql`jsonb_build_object(
        'id', o.id,
        'partner_id', o.partner_id,
        'status', o.status,
        'total_amount', o.total_amount,
        'tip_amount', o.tip_amount,
        'requested_delivery_time', o.requested_delivery_time,
        'items', COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'item_name', ci.name,
                'quantity', oi.quantity,
                'price', oi.price,
                'note', oi.note
              )
            )
            FROM order_item oi
            LEFT JOIN catalog_item ci ON oi.catalog_item_id = ci.id
            WHERE oi.order_id = o.id
          ),
          '[]'::jsonb
        )
      )`.as('order'),
      sql`jsonb_build_object(
        'name', COALESCE(p.name, 'Unknown Restaurant'),
        'phone', p.phone_number,
        'address', pa.address_detail,
        'street', ps.name,
        'postal_code', ppc.code,
        'city', pc.name,
        'country', pcn.name,
        'latitude', pa.latitude,
        'longitude', pa.longitude
      )`.as('pickup'),
      sql`jsonb_build_object(
        'customer_name', COALESCE(u.first_name || ' ' || u.last_name, 'Unknown Customer'),
        'phone', u.phone_number,
        'address', ca.address_detail,
        'street', cs.name,
        'postal_code', cpc.code,
        'city', cc.name,
        'country', ccn.name,
        'country_iso', ccn.iso,
        'latitude', ca.latitude,
        'longitude', ca.longitude
      )`.as('delivery')
    ])
    .where('d.courier_id', '=', courierId)
    .where('d.status', 'not in', ['delivered', 'failed', 'canceled'])
    .orderBy('d.created_at', 'desc')
    .execute();
},

      async findDeliveryByOrderId(orderId): Promise<DeliveryRow | undefined> {
        return await dbOrTrx
          .selectFrom('delivery')
          .selectAll()
          .where('order_id', '=', orderId)
          .executeTakeFirst();
      },

      async updateDeliveryStatus(id, status): Promise<DeliveryRow> {
        const updateData = getStatusTimestampFields(status);

        return await dbOrTrx
          .updateTable('delivery')
          .set(updateData)
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirstOrThrow();
      },

      async updateCourierLocation(locationData): Promise<CourierLocationRow> {
        return await dbOrTrx
          .insertInto('courier_location')
          .values(locationData)
          .returningAll()
          .executeTakeFirstOrThrow();
      },

      async getAvailableCouriers(): Promise<{ courier_id: string, active_deliveries: number }[]> {
        try {

          const activeCouriers = await dbOrTrx
            .selectFrom('time_entry as t')
            .innerJoin('employee as e', 't.courier_id', 'e.id')
            .select('e.user_id as courier_id')
            .where('t.clock_out', 'is', null)
            .execute();

          if (activeCouriers.length === 0) {
            return [];
          }

          const courierIds = activeCouriers.map(c => c.courier_id);

          const deliveryCounts = await dbOrTrx
            .selectFrom('delivery as d')
            .select(['d.courier_id', db.fn.count<number>('d.id').as('active_deliveries')])
            .where('d.status', 'in', ['assigned', 'picked_up', 'in_transit'])
            .where('d.courier_id', 'in', courierIds)
            .groupBy('d.courier_id')
            .execute();

          // Map delivery counts to couriers, defaulting to 0 for those without deliveries
          return courierIds.map(courierId => {
            const found = deliveryCounts.find(d => d.courier_id === courierId);
            return {
              courier_id: courierId,
              active_deliveries: found ? Number(found.active_deliveries) : 0
            };
          });
        } catch (error) {
          console.error('Error in getAvailableCouriers:', error);
          return [];
        }
      },

      async findOrdersReadyForDelivery(limit: number = 10): Promise<any[]> {
        // Find orders that are ready but don't have a delivery record yet
        return await dbOrTrx
          .selectFrom('order as o')
          .leftJoin('delivery as d', 'o.id', 'd.order_id')
          .selectAll('o')
          .where(eb => eb.or([
            eb('o.status', '=', 'ready'),
            eb('o.status', '=', 'confirmed')
          ]))
          .where('o.delivery_type', '=', 'delivery') // Only orders for delivery
          .where('d.id', 'is', null) // No delivery record exists yet
          .limit(limit)
          .orderBy('o.requested_delivery_time', 'asc')
          .execute();
      },

      async transaction<T>(callback: (trx: DeliveryRepository) => Promise<T>): Promise<T> {
        const timeoutPromise = new Promise<never>((_, reject) => {
          const id = setTimeout(() => {
            clearTimeout(id);
            reject(new Error('Transaction timeout after 10 seconds'));
          }, 10000);
        });

        try {
          return await Promise.race([
            db.transaction().execute(async (trx) => {
              const trxRepo = createRepositoryWithDB(trx);
              return await callback(trxRepo);
            }),
            timeoutPromise
          ]);
        } catch (error) {
          console.error('Transaction error:', error);
          throw error;
        }
      },

      async directUpdateDeliveryStatus(id, status): Promise<DeliveryRow> {
        try {
          const updateData = getStatusTimestampFields(status);

          return await db
            .updateTable('delivery')
            .set(updateData)
            .where('id', '=', id)
            .returningAll()
            .executeTakeFirstOrThrow();
        } catch (error) {
          console.error(`Error in directUpdateDeliveryStatus(${id}, ${status}):`, error);
          throw error;
        }
      },
      async updateProofOfDelivery(deliveryId: number, proofOfDeliveryImage: string): Promise<void> {
        await dbOrTrx.updateTable('delivery')
          .set({
            proof_of_delivery_image: proofOfDeliveryImage
          })
          .where('id', '=', deliveryId)
          .executeTakeFirst();
      }
    };
  };

  return createRepositoryWithDB(db);
};
