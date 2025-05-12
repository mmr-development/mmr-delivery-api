import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface RoleTable {
    id: Generated<string>;
    name: string;
    description: string;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export type RoleRow = Selectable<RoleTable>;
export type InsertableRoleRow = Insertable<RoleTable>;
export type UpdateableRoleRow = Updateable<RoleTable>;
