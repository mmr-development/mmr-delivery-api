import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface AddressTable {
    id: Generated<number>;
    street_id: number;
    address_detail: string;
    postal_code_id: number;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export type AddressRow = Selectable<AddressTable>;
export type InsertableAddressRow = Insertable<AddressTable>;
export type UpdateableAddressRow = Updateable<AddressTable>;
