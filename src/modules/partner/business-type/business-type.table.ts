import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface BusinessTypeTable {
    id: Generated<number>;
    name: string;
}

export type BusinessTypeRow = Selectable<BusinessTypeTable>;
export type InsertablePartnerTypeRow = Insertable<BusinessTypeTable>;
export type UpdateableBusinessTypeRow = Updateable<BusinessTypeTable>;
