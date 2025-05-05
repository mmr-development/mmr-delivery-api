import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface PartnerHourTable {
    id: Generated<number>;
    partner_id: number;
    day_of_week: number;
    opens_at: string;
    closes_at: string;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export type PartnerHourRow = Selectable<PartnerHourTable>;
export type InsertablePartnerHourRow = Insertable<PartnerHourTable>;
export type UpdateablePartnerHourRow = Updateable<PartnerHourTable>;
