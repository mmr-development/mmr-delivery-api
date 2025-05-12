import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface UserRoleTable {
    id: Generated<number>;
    user_id: string;
    role_id: string;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export interface UserRoleWithName extends UserRoleRow {
    role_name: string;
  }

export type UserRoleRow = Selectable<UserRoleTable>;
export type InsertableUserRoleRow = Insertable<UserRoleTable>;
export type UpdateableUserRoleRow = Updateable<UserRoleTable>;
