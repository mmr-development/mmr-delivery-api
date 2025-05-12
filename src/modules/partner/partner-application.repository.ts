import { Kysely } from 'kysely';
import { Database } from '../../database';
import { InsertablePartnerRow, PartnerRow, PartnerWithRelationsRow, UpdateablePartnerRow } from './partner.table';

export interface PartnerApplicationRepository {
    create(application: InsertablePartnerRow): Promise<PartnerRow>;
    findAll(): Promise<PartnerWithRelationsRow[]>;
    findById(id: number): Promise<PartnerWithRelationsRow | undefined>;
    update(id: number, applicationData: UpdateablePartnerRow): Promise<PartnerRow>;
    delete(id: number): Promise<void>;
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
            const applications = await db
                .selectFrom('partner')
                .leftJoin('business_type', 'partner.business_type_id', 'business_type.id')
                .leftJoin('delivery_method', 'partner.delivery_method_id', 'delivery_method.id')
                .leftJoin('user', 'partner.user_id', 'user.id')
                .leftJoin('address', 'partner.address_id', 'address.id')
                .leftJoin('street', 'address.street_id', 'street.id')
                .leftJoin('postal_code', 'address.postal_code_id', 'postal_code.id')
                .leftJoin('city', 'postal_code.city_id', 'city.id')
                .leftJoin('country', 'city.country_id', 'country.id')
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
                .execute();

            return applications;
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