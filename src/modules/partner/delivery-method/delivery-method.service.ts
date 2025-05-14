import { Kysely } from 'kysely';
import { Database } from '../../../database';
import { CreateDeliveryMethodRequest, DeliveryMethod } from './delivery-method';
import { DeliveryMethodRow, UpdateableDeliveryMethodRow } from './delivery-method.table';
import { UpdateablePartnerRow } from '../partner.table';

export interface DeliveryMethodService {
    createDeliveryMethod(deliveryMethod: CreateDeliveryMethodRequest): Promise<DeliveryMethod>;
    getDeliveryMethods(
        options?: { offset?: number; limit?: number; }
    ): Promise<{ delivery_methods: DeliveryMethod[], count: number }>;
    getDeliveryMethodById(id: number): Promise<DeliveryMethod>;
    updateDeliveryMethod(id: number, deliveryMethod: CreateDeliveryMethodRequest): Promise<DeliveryMethod>;
    deleteDeliveryMethod(id: number): Promise<void>;
}

export function createDeliveryMethodService(db: Kysely<Database>): DeliveryMethodService {
    return {
        createDeliveryMethod: async function (deliveryMethod: CreateDeliveryMethodRequest): Promise<DeliveryMethod> {
            const createdDeliveryMethod = await db
                .insertInto('delivery_method')
                .values(deliveryMethod)
                .returningAll()
                .executeTakeFirstOrThrow();

            return deliveryMethodRowToDeliveryMethod(createdDeliveryMethod);
        },
        async getDeliveryMethods(
            options?: { 
                offset?: number; 
                limit?: number; 
            }): Promise<{ delivery_methods: DeliveryMethod[]; count: number}> {
            const offset = options?.offset ?? 0;
            const limit = options?.limit ?? null;

            const {count} = await db
                .selectFrom('delivery_method')
                .select(eb => eb.fn.countAll().as('count'))
                .executeTakeFirstOrThrow();

            let query = db
                .selectFrom('delivery_method')
                .selectAll()
                .orderBy('id', 'asc')
                .offset(offset);

            if(limit != null) {
                query = query.limit(limit);
            }

            const deliveryMethods = await query.execute();

            return {
                delivery_methods: deliveryMethods.map(deliveryMethodRowToDeliveryMethod),
                count: Number(count),
            };
        },
        getDeliveryMethodById: async function (id: number): Promise<DeliveryMethod> {
            const deliveryMethod = await db
                .selectFrom('delivery_method')
                .selectAll()
                .where('id', '=', id)
                .executeTakeFirstOrThrow();

            return deliveryMethodRowToDeliveryMethod(deliveryMethod);
        },
        updateDeliveryMethod: async function (id: number, updateWith: UpdateableDeliveryMethodRow): Promise<DeliveryMethod> {
            const updatedDeliveryMethod = await db
                .updateTable('delivery_method')
                .set(updateWith)
                .where('id', '=', id)
                .returningAll()
                .executeTakeFirstOrThrow();

            return deliveryMethodRowToDeliveryMethod(updatedDeliveryMethod);
        },
        deleteDeliveryMethod: async function (id: number): Promise<void> {
            await db
                .deleteFrom('delivery_method')
                .where('id', '=', id)
                .execute();
        },
    };
}

export function deliveryMethodRowToDeliveryMethod(deliveryMethod: DeliveryMethodRow): DeliveryMethod {
    return {
        id: deliveryMethod.id,
        name: deliveryMethod.name,
    };
}
