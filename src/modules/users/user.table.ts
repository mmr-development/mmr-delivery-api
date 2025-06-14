import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface UserTable {
    id: Generated<string>
    first_name: string
    last_name: string
    email: string
    phone_number: string
    created_at: Generated<Date>
    updated_at: Generated<Date>
}

export type UserRow = Selectable<UserTable>
export type InsertableUserRow = Insertable<UserTable>
export type UpdateableUserRow = Updateable<UserTable>

export interface UserRowWithRoles extends UserRow {
    roles: {
        id: string
        name: string
        description?: string
    }[]
}
