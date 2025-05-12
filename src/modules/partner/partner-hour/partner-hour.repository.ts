import { Kysely } from 'kysely';
import { Database } from '../../../database';
import { PartnerHourRow, InsertablePartnerHourRow, UpdateablePartnerHourRow } from './partner-hour.table';

export interface PartnerHourRepository {
    create(hour: InsertablePartnerHourRow): Promise<PartnerHourRow>;
    findAll(): Promise<PartnerHourRow[]>;
    findById(id: number): Promise<PartnerHourRow | undefined>;
    findByPartnerId(partner_id: number): Promise<PartnerHourRow[]>;
    update(id: number, hour: UpdateablePartnerHourRow): Promise<PartnerHourRow>;
    delete(id: number): Promise<void>;
}

export function createPartnerHourRepository(db: Kysely<Database>): PartnerHourRepository {
    return {
        async create(hour) {
            return await db.insertInto('partner_hour')
                .values(hour)
                .returningAll()
                .executeTakeFirstOrThrow();
        },
        async findAll() {
            return await db.selectFrom('partner_hour')
                .selectAll()
                .execute();
        },
        async findById(id) {
            return await db.selectFrom('partner_hour')
                .selectAll()
                .where('id', '=', id)
                .executeTakeFirst();
        },
        async findByPartnerId(partner_id) {
            return await db.selectFrom('partner_hour')
                .selectAll()
                .where('partner_id', '=', partner_id)
                .execute();
        },
        async update(id, hour) {
            return await db.updateTable('partner_hour')
                .set(hour)
                .where('id', '=', id)
                .returningAll()
                .executeTakeFirstOrThrow();
        },
        async delete(id) {
            await db.deleteFrom('partner_hour')
                .where('id', '=', id)
                .execute();
        }
    };
}