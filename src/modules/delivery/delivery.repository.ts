import { Kysely, Transaction } from 'kysely';
import { Database } from '../../database';
import { CourierLocationRow, DeliveryRow, DeliveryStatus } from './delivery.types';

export interface DeliveryRepository {
  createDelivery(delivery: Omit<DeliveryRow, 'id' | 'created_at' | 'updated_at' | 'assigned_at'>): Promise<DeliveryRow>;
  findDeliveryById(id: number, selectFields?: string[]): Promise<DeliveryRow | undefined>;
  findDeliveryByOrderId(orderId: number): Promise<DeliveryRow | undefined>;
  findDeliveriesByCourier(courierId: string): Promise<DeliveryRow[]>;
  findActiveDeliveriesByCourier(courierId: string): Promise<DeliveryRow[]>;
  findDetailedDeliveriesByCourier(courierId: string): Promise<any[]>; // New method
  findDetailedDeliveryById(id: number): Promise<any>; // New method
  findDetailedDeliveryByOrderId(orderId: number): Promise<any>; // New method
  updateDeliveryStatus(id: number, status: DeliveryStatus): Promise<DeliveryRow>;
  updateOrderStatus(orderId: number, status: string): Promise<any>;
  updateCourierLocation(locationData: Omit<CourierLocationRow, 'id' | 'timestamp'>): Promise<CourierLocationRow>;
  getActiveCouriers(): Promise<string[]>;
  getAvailableCouriers(): Promise<{courier_id: string, active_deliveries: number}[]>;
  findOrdersReadyForDelivery(limit?: number): Promise<any[]>;
  countCourierActiveDeliveries(courierId: string): Promise<number>;
  transaction<T>(callback: (trx: DeliveryRepository) => Promise<T>): Promise<T>;
  directUpdateDeliveryStatus(id: number, status: DeliveryStatus): Promise<DeliveryRow>;
}

export const createDeliveryRepository = (db: Kysely<Database>): DeliveryRepository => {
  // Helper function to add status-specific timestamp fields
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
  
  // Create repository implementation with the given db connection
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
      
      async findDeliveryByOrderId(orderId): Promise<DeliveryRow | undefined> {
        return await dbOrTrx
          .selectFrom('delivery')
          .selectAll()
          .where('order_id', '=', orderId)
          .executeTakeFirst();
      },
      
      async findDeliveriesByCourier(courierId): Promise<DeliveryRow[]> {
        return await dbOrTrx
          .selectFrom('delivery')
          .selectAll()
          .where('courier_id', '=', courierId)
          .orderBy('created_at', 'desc')
          .execute();
      },
      
      async findActiveDeliveriesByCourier(courierId): Promise<DeliveryRow[]> {
        return await dbOrTrx
          .selectFrom('delivery')
          .selectAll()
          .where('courier_id', '=', courierId)
          .where('status', 'not in', ['delivered', 'failed', 'canceled'])
          .orderBy('created_at', 'desc')
          .execute();
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
      
      async updateOrderStatus(orderId, status): Promise<any> {
        return await dbOrTrx
          .updateTable('order')
          .set({ 
            status, 
            updated_at: new Date() 
          })
          .where('id', '=', orderId)
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
      
      async getActiveCouriers(): Promise<string[]> {
        // Find all courier_ids from time_entry where clock_out is null (active couriers)
        const activeTimeEntries = await dbOrTrx
          .selectFrom('time_entry as t')
          .innerJoin('employee as e', 't.courier_id', 'e.id')
          .select('e.user_id as courier_id')
          .where('t.clock_out', 'is', null)
          .execute();
        
        return activeTimeEntries.map(entry => entry.courier_id);
      },
      
      async getAvailableCouriers(): Promise<{courier_id: string, active_deliveries: number}[]> {
        try {
          // Get all active couriers (those who are clocked in)
          const activeCouriers = await dbOrTrx
            .selectFrom('time_entry as t')
            .innerJoin('employee as e', 't.courier_id', 'e.id')
            .select('e.user_id as courier_id')
            .where('t.clock_out', 'is', null)
            .execute();
          
          if (activeCouriers.length === 0) {
            return [];
          }
          
          // Get the list of courier_ids as an array
          const courierIds = activeCouriers.map(c => c.courier_id);
          
          // Get active delivery counts for each courier
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
      
      async countCourierActiveDeliveries(courierId: string): Promise<number> {
        const result = await dbOrTrx
          .selectFrom('delivery')
          .select(db.fn.count<number>('id').as('count'))
          .where('courier_id', '=', courierId)
          .where('status', 'in', ['assigned', 'picked_up', 'in_transit'])
          .executeTakeFirst();
          
        return Number(result?.count || 0);
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
          
          // Use db directly, not dbOrTrx to avoid any transaction issues
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
      
      async findDetailedDeliveriesByCourier(courierId: string): Promise<any[]> {
        try {
          // Get basic delivery records
          const deliveries = await dbOrTrx
            .selectFrom('delivery as d')
            .selectAll('d')
            .where('d.courier_id', '=', courierId)
            .where('d.status', 'not in', ['delivered', 'failed', 'canceled'])
            .orderBy('d.created_at', 'desc')
            .execute();
          
          // Enhance each delivery with additional information
          const enhancedDeliveries = await Promise.all(deliveries.map(async delivery => {
            // Get order information
            const order = await dbOrTrx
              .selectFrom('order as o')
              .select(['o.id', 'o.partner_id', 'o.status', 'o.total_amount', 'o.tip_amount', 'o.requested_delivery_time'])
              .where('o.id', '=', delivery.order_id)
              .executeTakeFirst();
              
            // Get order items
            const orderItems = await dbOrTrx
              .selectFrom('order_item as oi')
              .leftJoin('catalog_item as ci', 'oi.catalog_item_id', 'ci.id')
              .select(['ci.name as item_name', 'oi.quantity', 'oi.price', 'oi.note'])
              .where('oi.order_id', '=', delivery.order_id)
              .execute();
              
            // Get pickup (partner) location
            const pickup = await dbOrTrx
              .selectFrom('partner as p')
              .innerJoin('address as a', 'p.address_id', 'a.id')
              .select(['p.name', 'a.latitude', 'a.longitude'])
              .where('p.id', '=', order?.partner_id)
              .executeTakeFirst();
            
            // Get delivery (customer) location
            const deliveryLocation = await dbOrTrx
              .selectFrom('order as o')
              .innerJoin('customer as c', 'o.customer_id', 'c.id')
              .innerJoin('user as u', 'c.user_id', 'u.id')
              .innerJoin('address as a', 'c.address_id', 'a.id')
              .select([
                'u.first_name', 
                'u.last_name', 
                'u.phone_number',
                'a.latitude', 
                'a.longitude',
                'a.address_detail'
              ])
              .where('o.id', '=', delivery.order_id)
              .executeTakeFirst();
            console.log({
              ...delivery,
              order: {
                ...order,
                items: orderItems
              },
              pickup: pickup || { name: 'Unknown Restaurant', lat: null, lng: null },
              delivery: deliveryLocation ? {
                customer_name: `${deliveryLocation.first_name} ${deliveryLocation.last_name}`,
                phone: deliveryLocation.phone_number,
                address: deliveryLocation.address_detail,
                lat: deliveryLocation.latitude,
                lng: deliveryLocation.longitude
              } : { customer_name: 'Unknown Customer', lat: null, lng: null }
            });
            return {
              ...delivery,
              order: {
                ...order,
                items: orderItems
              },
              pickup: pickup || { name: 'Unknown Restaurant', lat: null, lng: null },
              delivery: deliveryLocation ? {
                customer_name: `${deliveryLocation.first_name} ${deliveryLocation.last_name}`,
                phone: deliveryLocation.phone_number,
                address: deliveryLocation.address_detail,
                lat: deliveryLocation.latitude,
                lng: deliveryLocation.longitude
              } : { customer_name: 'Unknown Customer', lat: null, lng: null }
            };
          }));
          
          return enhancedDeliveries;
        } catch (error) {
          console.error(`Error in findDetailedDeliveriesByCourier(${courierId}):`, error);
          throw error;
        }
      },
      
      async findDetailedDeliveryById(id: number): Promise<any> {
        try {
          const delivery = await dbOrTrx
            .selectFrom('delivery')
            .selectAll()
            .where('id', '=', id)
            .executeTakeFirst();
            
          if (!delivery) return undefined;
          
          return this.enhanceDeliveryWithDetails(delivery);
        } catch (error) {
          console.error(`Error in findDetailedDeliveryById(${id}):`, error);
          throw error;
        }
      },
      
      async findDetailedDeliveryByOrderId(orderId: number): Promise<any> {
        try {
          const delivery = await dbOrTrx
            .selectFrom('delivery')
            .selectAll()
            .where('order_id', '=', orderId)
            .executeTakeFirst();
            
          if (!delivery) return undefined;
          
          return this.enhanceDeliveryWithDetails(delivery);
        } catch (error) {
          console.error(`Error in findDetailedDeliveryByOrderId(${orderId}):`, error);
          throw error;
        }
      },
      
      async enhanceDeliveryWithDetails(delivery: DeliveryRow): Promise<any> {
        // Get order information
        const order = await dbOrTrx
          .selectFrom('order as o')
          .select(['o.id', 'o.partner_id', 'o.status', 'o.total_amount', 'o.tip_amount', 'o.requested_delivery_time'])
          .where('o.id', '=', delivery.order_id)
          .executeTakeFirst();
          
        // Get order items
        const orderItems = await dbOrTrx
          .selectFrom('order_item as oi')
          .leftJoin('catalog_item as ci', 'oi.catalog_item_id', 'ci.id')
          .select(['ci.name as item_name', 'oi.quantity', 'oi.price', 'oi.note'])
          .where('oi.order_id', '=', delivery.order_id)
          .execute();
          
        // Get pickup (partner) location
        const pickup = await dbOrTrx
          .selectFrom('partner as p')
          .innerJoin('address as a', 'p.address_id', 'a.id')
          .select(['p.name', 'a.latitude', 'a.longitude'])
          .where('p.id', '=', order?.partner_id)
          .executeTakeFirst();
        
        // Get delivery (customer) location
        const deliveryLocation = await dbOrTrx
          .selectFrom('order as o')
          .innerJoin('customer as c', 'o.customer_id', 'c.id')
          .innerJoin('user as u', 'c.user_id', 'u.id')
          .innerJoin('address as a', 'c.address_id', 'a.id')
          .select([
            'u.first_name', 
            'u.last_name', 
            'u.phone_number',
            'a.latitude', 
            'a.longitude',
            'a.address_detail'
          ])
          .where('o.id', '=', delivery.order_id)
          .executeTakeFirst();
        
        return {
          ...delivery,
          order: {
            ...order,
            items: orderItems
          },
          pickup: pickup || { name: 'Unknown Restaurant', lat: null, lng: null },
          delivery: deliveryLocation ? {
            customer_name: `${deliveryLocation.first_name} ${deliveryLocation.last_name}`,
            phone: deliveryLocation.phone_number,
            address: deliveryLocation.address_detail,
            lat: deliveryLocation.latitude,
            lng: deliveryLocation.longitude
          } : { customer_name: 'Unknown Customer', lat: null, lng: null }
        };
      },
    };
  };
  
  return createRepositoryWithDB(db);
};
