import { Kysely } from 'kysely';
import { Database } from '../../../database';
import { EmployeeRow, InsertableEmployeeRow, UpdateableEmployeeRow } from '../employee.table';
import { GetCouriersOptions } from './courier.service';

export interface CourierWithUserRow extends EmployeeRow {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
}

export interface CourierColleague {
    id: number;
    user_uuid: string;
    first_name: string;
    last_name: string;
    role: string; 
}

export interface CourierRepository {
    createCourier(courier: InsertableEmployeeRow): Promise<EmployeeRow>;
    getCouriers(options: GetCouriersOptions): Promise<{ couriers: CourierWithUserRow[]; total: number }>;
    getColleagues(currentUserUuid?: string): Promise<CourierColleague[]>;
    getCourierById(id: number): Promise<CourierWithUserRow | undefined>;
    updateCourier(id: number, courier: UpdateableEmployeeRow): Promise<EmployeeRow>;
    deleteCourier(id: number): Promise<void>;
    getCourierByUserId(userId: string): Promise<CourierWithUserRow | undefined>;
}

export function createCourierRepository(db: Kysely<Database>): CourierRepository {
    return {
        async createCourier(courier) {
            return await db.insertInto('employee')
                .values(courier)
                .returningAll()
                .executeTakeFirstOrThrow();
        },
        async getCouriers(options) {
            let query = db
                .selectFrom('employee')
                .innerJoin('user', 'employee.user_id', 'user.id');

            if (options.user_id) {
                query = query.where('employee.user_id', '=', options.user_id);
            }
            if (options.status) {
                query = query.where('employee.status', '=', options.status);
            }
            if (options.offset !== undefined) {
                query = query.offset(options.offset);
            }
            if (options.limit !== undefined) {
                query = query.limit(options.limit);
            }

            const couriersRaw = await query
                .select([
                    'employee.id',
                    'employee.user_id',
                    'employee.vehicle_type_id',
                    'employee.address_id',
                    'employee.schedule_preference_id',
                    'employee.hours_preference_id',
                    'employee.data_retention_consent',
                    'employee.is_eighteen_plus',
                    'employee.status',
                    'employee.created_at',
                    'employee.updated_at',
                    'user.first_name',
                    'user.last_name',
                    'user.email',
                    'user.phone_number'
                ])
                .execute();

            const couriers: CourierWithUserRow[] = couriersRaw.map(courier => ({
                ...courier,
                id: Number(courier.id)
            }));

            const countResult = await db.selectFrom('employee')
                .select(({ fn }) => [fn.countAll().as('count')])
                .executeTakeFirst();
            const total = Number(countResult?.count ?? 0);

            return { couriers, total };
        },
        async getColleagues(currentUserUuid?: string) {
            let query = db
                .selectFrom('employee')
                .innerJoin('user', 'employee.user_id', 'user.id')
                .innerJoin('user_role', 'user.id', 'user_role.user_id')
                .innerJoin('role', 'user_role.role_id', 'role.id')
                .select([
                    'employee.id',
                    'user.id as user_uuid',
                    'user.first_name',
                    'user.last_name',
                    'role.name as role'
                ])
                .where('employee.status', '=', 'approved')
                .where('role.name', '=', 'courier');

            if (currentUserUuid) {
                query = query.where('user.id', '!=', currentUserUuid);
            }

            return await query.execute();
        },
        async getCourierById(id) {
            const result = await db
                .selectFrom('employee')
                .innerJoin('user', 'employee.user_id', 'user.id')
                .select([
                    'employee.id',
                    'employee.user_id',
                    'employee.vehicle_type_id',
                    'employee.address_id',
                    'employee.schedule_preference_id',
                    'employee.hours_preference_id',
                    'employee.data_retention_consent',
                    'employee.is_eighteen_plus',
                    'employee.status',
                    'employee.created_at',
                    'employee.updated_at',
                    'user.first_name',
                    'user.last_name',
                    'user.email',
                    'user.phone_number'
                ])
                .where('employee.id', '=', id)
                .executeTakeFirst();

            if (!result) return undefined;
            return {
                ...result,
                id: Number(result.id)
            } as CourierWithUserRow;
        },
        async updateCourier(id, courier) {
            return await db.updateTable('employee')
                .set(courier)
                .where('id', '=', id)
                .returningAll()
                .executeTakeFirstOrThrow();
        },
        async deleteCourier(id) {
            await db.deleteFrom('employee')
                .where('id', '=', id)
                .execute();
        },
        async getCourierByUserId(userId) {
            const result = await db
                .selectFrom('employee')
                .innerJoin('user', 'employee.user_id', 'user.id')
                .select([
                    'employee.id',
                    'employee.user_id',
                    'employee.vehicle_type_id',
                    'employee.address_id',
                    'employee.schedule_preference_id',
                    'employee.hours_preference_id',
                    'employee.data_retention_consent',
                    'employee.is_eighteen_plus',
                    'employee.status',
                    'employee.created_at',
                    'employee.updated_at',
                    'user.first_name',
                    'user.last_name',
                    'user.email',
                    'user.phone_number'
                ])
                .where('user.id', '=', userId)
                .executeTakeFirst();

            if (!result) return undefined;
            return {
                ...result,
                id: Number(result.id)
            } as CourierWithUserRow;
        }
    };
}