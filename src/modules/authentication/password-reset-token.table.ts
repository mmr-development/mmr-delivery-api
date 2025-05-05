import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface PasswordResetTokenTable {
    id: Generated<number>;
    email: string;
    token: string;
    is_used: boolean;
    expires_at: Date;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export type PasswordResetTokenRow = Selectable<PasswordResetTokenTable>;
export type InsertablePasswordResetTokenRow = Insertable<PasswordResetTokenTable>;
export type UpdateablePasswordResetTokenRow = Updateable<PasswordResetTokenTable>;
