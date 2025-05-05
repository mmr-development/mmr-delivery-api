import { Kysely } from 'kysely';
import { Database } from '../../database';
import { InsertablePartnerRow, PartnerRow, PartnerWithRelationsRow } from './partner.table';

// partner-application.repository.ts
export interface PartnerApplicationRepository {
    create(application: InsertablePartnerRow): Promise<PartnerRow>; // Returns application ID
    findAll(): Promise<PartnerWithRelationsRow[]>;
    findById(id: number): Promise<PartnerWithRelationsRow | undefined>;
    // findAll(filters?: any): Promise<any[]>;
    // findById(id: number): Promise<any>;
    // updateStatus(id: number, status: string, reviewNotes?: string): Promise<void>;
    // delete(id: number): Promise<void>;
}

export function createPartnerApplicationRepository(db: Kysely<Database>): PartnerApplicationRepository {
    return {
        async create(application: InsertablePartnerRow): Promise<PartnerRow> {
            const insertedApplication = await db
                .insertInto('partner')
                .values(application)
                .returningAll()
                .executeTakeFirstOrThrow();

            return insertedApplication;
        },
        async findAll(): Promise<PartnerWithRelationsRow[]> {
            const partnerRows = await db
                .selectFrom('partner')
                .leftJoin('business_type', 'partner.business_type_id', 'business_type.id')
                .leftJoin('delivery_method', 'partner.delivery_method_id', 'delivery_method.id')
                .leftJoin('user', 'partner.user_id', 'user.id')
                .select([
                    'partner.id',
                    'partner.name',
                    'business_type.id as business_type_id',
                    'business_type.name as business_type_name',
                    'delivery_method.id as delivery_method_id', 
                    'delivery_method.name as delivery_method_name',
                    'user.id as user_id',
                    'user.first_name',
                    'user.last_name',
                    'user.email as user_email',
                    'user.phone_number',
                  ])
                .execute();
                  
            return partnerRows;
        },
        async findById(id: number): Promise<PartnerWithRelationsRow | undefined> {
            const partnerRow = await db
                .selectFrom('partner')
                .leftJoin('business_type', 'partner.business_type_id', 'business_type.id')
                .leftJoin('delivery_method', 'partner.delivery_method_id', 'delivery_method.id')
                .leftJoin('user', 'partner.user_id', 'user.id')
                .where('partner.id', '=', id)
                .select([
                    'partner.id',
                    'partner.name',
                    'business_type.id as business_type_id',
                    'business_type.name as business_type_name',
                    'delivery_method.id as delivery_method_id', 
                    'delivery_method.name as delivery_method_name',
                    'user.id as user_id',
                    'user.first_name',
                    'user.last_name',
                    'user.email as user_email',
                    'user.phone_number',
                  ])
                .executeTakeFirst()

            return partnerRow;
        },
    };
}