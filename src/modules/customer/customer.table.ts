import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface CustomerTable {
  id: Generated<number>;
  user_id: string;
  address_id: number;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type CustomerRow = Selectable<CustomerTable>;
export type InsertableCustomerRow = Insertable<CustomerTable>;
export type UpdateableCustomerRow = Updateable<CustomerTable>;
