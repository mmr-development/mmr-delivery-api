import { Kysely } from 'kysely';
import { Database } from '../../../database';

export interface PartnerApplicationRepository {
  findById(id: number): Promise<any>;
  findByActivationToken(token: string): Promise<any>;
  findAll(options?: { offset?: number; limit?: number; filters?: { status?: string; } }): Promise<{ applications: any[]; count: number }>;

  create(application: any): Promise<any>;
  update(id: number, data: any): Promise<any>;
  updateStatus(id: number, status: string, rejectionReason?: string): Promise<any>;
  saveActivationToken(id: number, token: string): Promise<void>;
  delete(id: number): Promise<void>;
}

export function createPartnerApplicationRepository(db: Kysely<Database>): PartnerApplicationRepository {
  return {
    async findById(id: number) {
      return await db
        .selectFrom('partner as p')
        .leftJoin('user as u', 'p.user_id', 'u.id')
        .leftJoin('address as a', 'p.address_id', 'a.id')
        .leftJoin('delivery_method as dm', 'p.delivery_method_id', 'dm.id')
        .leftJoin('business_type as bt', 'p.business_type_id', 'bt.id')
        .where('p.id', '=', id)
        .select([
          'p.id', 
          'p.name', 
          'p.phone_number', 
          'p.status', 
          'p.delivery_method_id', 
          'p.business_type_id', 
          'p.user_id',
          'p.delivery_fee', 
          'p.min_order_value', 
          'p.max_delivery_distance_km', 
          'p.created_at', 
          'p.updated_at',
          'u.email as user_email', 
          'u.first_name', 
          'u.last_name',
          'dm.name as delivery_method_name',
          'bt.name as business_type_name'
        ])
        .executeTakeFirst();
    },

    async findByActivationToken(token: string) {
      return await db
        .selectFrom('partner')
        .where('activation_token', '=', token)
        .selectAll()
        .executeTakeFirst();
    },

    async findAll(options?: { offset?: number; limit?: number; filters?: { status?: string; } }) {
      let query = db
        .selectFrom('partner as p')
        .leftJoin('user as u', 'p.user_id', 'u.id')
        .leftJoin('address as a', 'p.address_id', 'a.id')
        .leftJoin('delivery_method as dm', 'p.delivery_method_id', 'dm.id')
        .leftJoin('business_type as bt', 'p.business_type_id', 'bt.id');
        
      // Apply filters before selecting
      if (options?.filters?.status) {
        query = query.where('p.status', '=', options.filters.status);
      }
      
      // Select columns directly with a simple array
      query = query.select([
        'p.id', 'p.name', 'p.phone_number', 'p.status',
        'p.delivery_method_id', 'p.business_type_id', 'p.user_id',
        'p.created_at', 'p.updated_at',
        'u.email as user_email', 'u.first_name', 'u.last_name',
        'a.street', 'a.city', 'a.postal_code', 'a.country', 'a.address_detail',
        'dm.name as delivery_method_name',
        'bt.name as business_type_name'
      ]);
      
      // Apply pagination
      if (options?.limit !== undefined) {
        query = query.limit(options.limit);
      }
      if (options?.offset !== undefined) {
        query = query.offset(options.offset);
      }

      // Get total count 
      const countQuery = db
        .selectFrom('partner as p')
        .where(qb => {
          if (options?.filters?.status) {
            return qb.where('p.status', '=', options.filters.status);
          }
          return qb;
        })
        .select(({ fn }) => [fn.count<number>('p.id').as('count')]);
        
      const [applications, countResult] = await Promise.all([
        query.execute(),
        countQuery.executeTakeFirst()
      ]);
      
      return {
        applications,
        count: Number(countResult?.count || 0)
      };
    },

    async create(application: any) {
      return await db
        .insertInto('partner')
        .values(application)
        .returningAll()
        .executeTakeFirst();
    },

    async update(id: number, data: any) {
      return await db
        .updateTable('partner')
        .set(data)
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst();
    },

    async updateStatus(id: number, status: string, rejectionReason?: string) {
      const updateData: Record<string, any> = { status };
      
      if (rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }
      
      return await db
        .updateTable('partner')
        .set(updateData)
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst();
    },

    async saveActivationToken(id: number, token: string) {
      await db
        .updateTable('partner')
        .set({ activation_token: token })
        .where('id', '=', id)
        .execute();
    },

    async delete(id: number) {
      await db
        .deleteFrom('partner')
        .where('id', '=', id)
        .execute();
    }
  };
}
