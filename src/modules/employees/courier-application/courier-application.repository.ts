import { Kysely, SelectQueryBuilder } from 'kysely';
import { jsonArrayFrom, jsonObjectFrom } from 'kysely/helpers/postgres';
import { Database } from '../../../database';
import { InsertableEmployeeRow, EmployeeRow, UpdateableEmployeeRow, EmployeeWithRelationsRow } from '../employee.table';
import { CourierWithRelationsRow } from './courier';

export interface CourierApplicationRepository {
    create(application: InsertableEmployeeRow): Promise<EmployeeRow>;
    findAll(options?: { offset?: number; limit?: number; filters?: { name?:string, user_email?:string, status?: string; } }): Promise<{ applications: EmployeeWithRelationsRow[]; count: number }>;
    findById(id: number): Promise<EmployeeWithRelationsRow | null>;
    update(id: number, application: UpdateableEmployeeRow): Promise<EmployeeRow>;
    delete(id: number): Promise<void>;
}

export function createCourierApplicationRepository(db: Kysely<Database>): CourierApplicationRepository {
    return {
        async create(application: InsertableEmployeeRow): Promise<EmployeeRow> {
            const insertedApplication = await db
                .insertInto('employee')
                .values(application)
                .returningAll()
                .executeTakeFirstOrThrow();

            return insertedApplication;
        },
        async findAll(
            options?: {
                offset?: number;
                limit?: number;
                filters?: {
                    name?: string;
                    status?: string;
                    user_email?: string;
                };
            }
        ): Promise<{ applications: EmployeeWithRelationsRow[]; count: number }> {
            const offset = options?.offset ?? 0;
            const limit = options?.limit ?? null;
            const filters = options?.filters ?? {};

            const baseQuery = db
                .selectFrom('employee')
                .innerJoin('user', 'employee.user_id', 'user.id')
                .innerJoin('vehicle_type', 'employee.vehicle_type_id', 'vehicle_type.id')
                .innerJoin('schedule_preference', 'employee.schedule_preference_id', 'schedule_preference.id')
                .innerJoin('hour_preference', 'employee.hours_preference_id', 'hour_preference.id')
                .innerJoin('address', 'employee.address_id', 'address.id')
                .innerJoin('street', 'address.street_id', 'street.id')
                .innerJoin('postal_code', 'address.postal_code_id', 'postal_code.id')
                .innerJoin('city', 'postal_code.city_id', 'city.id')
                .innerJoin('country', 'city.country_id', 'country.id');
                

            if(filters.name) {
                const searchTerm = `%${filters.name}%`;
                baseQuery.where((eb) => eb.or([
                    eb('user.first_name', 'like', searchTerm),
                    eb('user.last_name', 'like', searchTerm)
                ]))
            }
            if(filters.status) {
                baseQuery.where('employee.status', '=', filters.status);
            }
            if(filters.user_email) {
                baseQuery.where('user.email', '=', filters.user_email);
            }

            const { count } = await baseQuery
                .select(eb => eb.fn.countAll().as('count'))
                .executeTakeFirstOrThrow();

            let dataQuery = baseQuery
                .select(eb => [
                    'employee.id',
                    'employee.user_id',
                    'employee.vehicle_type_id',
                    'employee.address_id',
                    'employee.schedule_preference_id',
                    'employee.hours_preference_id',
                    'employee.data_retention_consent',
                    'employee.status',
                    'employee.is_eighteen_plus',

                    // User fields
                    'user.first_name',
                    'user.last_name',
                    'user.email',
                    'user.phone_number',

                    // Vehicle type fields
                    'vehicle_type.name as vehicle_type_name',

                    // Preference fields
                    'schedule_preference.name as schedule_preference_name',
                    'hour_preference.name as hours_preference_name',

                    // Address fields
                    'address.id as address_id',
                    'address.address_detail',
                    'street.name as street_name',
                    'postal_code.code as postal_code',
                    'city.name as city_name',
                    'country.name as country_name',
                    'country.iso as country_iso',

                    jsonArrayFrom(
                        eb.selectFrom('employee_documentation')
                            .select([
                                'employee_documentation.id',
                                'employee_documentation.document_type',
                                'employee_documentation.document_number',
                                'employee_documentation.issue_date',
                                'employee_documentation.expiry_date',
                                'employee_documentation.verification_status',
                                'employee_documentation.verified_by',
                                'employee_documentation.verification_date',
                                'employee_documentation.document_url'
                            ])
                            .whereRef('employee_documentation.employee_id', '=', 'employee.id')
                            .orderBy('employee_documentation.id')
                    ).as('employee_documentation')
                ])
                .offset(offset);

            if (limit !== null) {
                dataQuery = dataQuery.limit(limit);
            }
            
            const applications = await dataQuery
                .orderBy('employee.id')
                .execute();

            return{
                applications,
                count: Number(count)
            }
        },
        async findById(id: number): Promise<EmployeeWithRelationsRow | null> {
            const applications = await db
                .selectFrom('employee')
                .where('employee.id', '=', id)
                .innerJoin('user', 'employee.user_id', 'user.id')
                .innerJoin('vehicle_type', 'employee.vehicle_type_id', 'vehicle_type.id')
                .innerJoin('schedule_preference', 'employee.schedule_preference_id', 'schedule_preference.id')
                .innerJoin('hour_preference', 'employee.hours_preference_id', 'hour_preference.id')
                .innerJoin('address', 'employee.address_id', 'address.id')
                .innerJoin('street', 'address.street_id', 'street.id')
                .innerJoin('postal_code', 'address.postal_code_id', 'postal_code.id')
                .innerJoin('city', 'postal_code.city_id', 'city.id')
                .innerJoin('country', 'city.country_id', 'country.id')
                .select(eb => [
                    // Employee fields
                    'employee.id',
                    'employee.user_id',
                    'employee.vehicle_type_id',
                    'employee.address_id',
                    'employee.schedule_preference_id',
                    'employee.hours_preference_id',
                    'employee.data_retention_consent',
                    'employee.is_eighteen_plus',

                    // User fields
                    'user.first_name',
                    'user.last_name',
                    'user.email',
                    'user.phone_number',

                    // Vehicle type fields
                    'vehicle_type.name as vehicle_type_name',

                    // Preference fields
                    'schedule_preference.name as schedule_preference_name',
                    'hour_preference.name as hours_preference_name',

                    // Address fields
                    'address.id as address_id',
                    'address.address_detail',
                    'street.name as street_name',
                    'postal_code.code as postal_code',
                    'city.name as city_name',
                    'country.name as country_name',
                    'country.iso as country_iso',

                    jsonArrayFrom(
                        eb.selectFrom('employee_documentation')
                            .select([
                                'employee_documentation.id',
                                'employee_documentation.document_type',
                                'employee_documentation.document_number',
                                'employee_documentation.issue_date',
                                'employee_documentation.expiry_date',
                                'employee_documentation.verification_status',
                                'employee_documentation.verified_by',
                                'employee_documentation.verification_date',
                                'employee_documentation.document_url'
                            ])
                            .whereRef('employee_documentation.employee_id', '=', 'employee.id')
                            .orderBy('employee_documentation.id')
                    ).as('employee_documentation')
                ])
                .executeTakeFirstOrThrow();

            return applications
        },
        async update(id: number, application: UpdateableEmployeeRow): Promise<EmployeeRow> {
            const updatedApplication = await db
                .updateTable('employee')
                .set(application)
                .where('id', '=', id)
                .returningAll()
                .executeTakeFirstOrThrow();

            return updatedApplication;
        },
        async delete(id: number): Promise<void> {
            await db
                .deleteFrom('employee')
                .where('id', '=', id)
                .executeTakeFirstOrThrow();
        },
    }
}