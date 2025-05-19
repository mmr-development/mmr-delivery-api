import { Kysely } from 'kysely';
import { Database } from '../../database';
import { InsertablePartnerRow, PartnerRow, PartnerWithRelationsRow, UpdateablePartnerRow } from './partner.table';

export interface PartnerApplicationRepository {
    create(application: InsertablePartnerRow): Promise<PartnerRow>;
    findAll(options?: { offset?: number; limit?: number; filters?: { status?: string; } }): Promise<{ applications: PartnerWithRelationsRow[]; count: number }>;
    findById(id: number): Promise<PartnerWithRelationsRow | undefined>;
    update(id: number, applicationData: UpdateablePartnerRow): Promise<PartnerRow>;
    delete(id: number): Promise<void>;
}

export function createPartnerApplicationRepository(db: Kysely<Database>): PartnerApplicationRepository {
    return {
        async create(application: InsertablePartnerRow): Promise<PartnerRow> {
            console.log('Creating partner application:', application);
            const insertedApplication = await db
                .insertInto('partner')
                .values(application)
                .returningAll()
                .executeTakeFirstOrThrow();

            // fill out partner hours with default values not from the request
            // parnter id, day of week as int, opens_at, closes_at

            const partnerId = insertedApplication.id;
            const partnerHours = [
                { partner_id: partnerId, day_of_week: 0, opens_at: '08:00', closes_at: '17:00' }, // Monday
                { partner_id: partnerId, day_of_week: 1, opens_at: '08:00', closes_at: '17:00' }, // Tuesday
                { partner_id: partnerId, day_of_week: 2, opens_at: '08:00', closes_at: '17:00' }, // Wednesday
                { partner_id: partnerId, day_of_week: 3, opens_at: '08:00', closes_at: '17:00' }, // Thursday
                { partner_id: partnerId, day_of_week: 4, opens_at: '08:00', closes_at: '17:00' }, // Friday
                { partner_id: partnerId, day_of_week: 5, opens_at: '09:00', closes_at: '15:00' }, // Saturday
                { partner_id: partnerId, day_of_week: 6, opens_at: '10:00', closes_at: '14:00' }, // Sunday
            ]
            
            await db
                .insertInto('partner_hour')
                .values(partnerHours)
                .execute();


            return insertedApplication;
        },
        async findAll(options?: { 
            offset?: number; 
            limit?: number; 
            filters?: { 
                name?: string; 
                status?: string; 
                user_email?: string; 
            } 
        }): Promise<{ applications: PartnerWithRelationsRow[]; count: number; limit?: number; offset?: number }> {
            const offset = options?.offset ?? 0;
            const limit = options?.limit ?? null;
            const filters = options?.filters ?? {};
            
            // Base query for both count and data
            let baseQuery = db
                .selectFrom('partner')
                .leftJoin('business_type', 'partner.business_type_id', 'business_type.id')
                .leftJoin('delivery_method', 'partner.delivery_method_id', 'delivery_method.id')
                .leftJoin('user', 'partner.user_id', 'user.id')
                .leftJoin('address', 'partner.address_id', 'address.id')
                .leftJoin('street', 'address.street_id', 'street.id')
                .leftJoin('postal_code', 'address.postal_code_id', 'postal_code.id')
                .leftJoin('city', 'postal_code.city_id', 'city.id')
                .leftJoin('country', 'city.country_id', 'country.id');
                
            // Apply filters
            if (filters.name) {
                const searchTerm = `%${filters.name}%`;
                baseQuery = baseQuery.where('partner.name', 'like', searchTerm);
            }
            if (filters.status) {
                baseQuery = baseQuery.where('partner.status', '=', filters.status);
            }
            if (filters.user_email) {
                baseQuery = baseQuery.where('user.email', '=', filters.user_email);
            }
            
            // Get total count
            const { count } = await baseQuery
                .select(eb => eb.fn.countAll().as('count'))
                .executeTakeFirstOrThrow();
                
            // Get paginated data
            let dataQuery = baseQuery
                .select([
                    'partner.id',
                    'partner.name',
                    'partner.status',
                    'business_type.id as business_type_id',
                    'business_type.name as business_type_name',
                    'delivery_method.id as delivery_method_id',
                    'delivery_method.name as delivery_method_name',
                    'user.id as user_id',
                    'user.first_name',
                    'user.last_name',
                    'user.email as user_email',
                    'user.phone_number',
                    'address.id as address_id',
                    'street.name as street',
                    'address.address_detail',
                    'city.name as city',
                    'postal_code.code as postal_code',
                    'country.name as country',
                ])
                .orderBy('partner.id')
                .offset(offset);
                
            if (limit !== null) {
                dataQuery = dataQuery.limit(limit);
            }
            
            const applications = await dataQuery.execute();
            
            return {
                applications,
                count: Number(count),
                ...(limit !== null && { limit }),
                offset
            };
        },
        async findById(id: number): Promise<PartnerWithRelationsRow | undefined> {
            const application = await db
                .selectFrom('partner')
                .leftJoin('business_type', 'partner.business_type_id', 'business_type.id')
                .leftJoin('delivery_method', 'partner.delivery_method_id', 'delivery_method.id')
                .leftJoin('user', 'partner.user_id', 'user.id')
                .leftJoin('address', 'partner.address_id', 'address.id')
                .leftJoin('street', 'address.street_id', 'street.id')
                .leftJoin('postal_code', 'address.postal_code_id', 'postal_code.id')
                .leftJoin('city', 'postal_code.city_id', 'city.id')
                .leftJoin('country', 'city.country_id', 'country.id')
                .where('partner.id', '=', id)
                .select([
                    'partner.id',
                    'partner.name',
                    'partner.status',
                    'business_type.id as business_type_id',
                    'business_type.name as business_type_name',
                    'delivery_method.id as delivery_method_id',
                    'delivery_method.name as delivery_method_name',
                    'user.id as user_id',
                    'user.first_name',
                    'user.last_name',
                    'user.email as user_email',
                    'user.phone_number',
                    'address.id as address_id',
                    'street.name as street',
                    'address.address_detail',
                    'city.name as city',
                    'postal_code.code as postal_code',
                    'country.name as country',
                ])
                .executeTakeFirst();

            return application;
        },
        async update(id: number, applicationData: UpdateablePartnerRow): Promise<PartnerRow> {
            const updatedApplication = await db
                .updateTable('partner')
                .set(applicationData)
                .where('id', '=', id)
                .returningAll()
                .executeTakeFirstOrThrow();

            return updatedApplication;
        },
        async delete(id: number): Promise<void> {
            await db
                .deleteFrom('partner')
                .where('id', '=', id)
                .execute();
        },
    };
}