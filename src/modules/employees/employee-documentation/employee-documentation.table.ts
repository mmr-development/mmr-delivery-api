import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface EmployeeDocumentationTable {
    id: Generated<number>;
    employee_id: number;
    document_type: string;
    document_number: string;
    issue_date: Date;
    expiry_date: Date;
    verification_status: string;
    verified_by: string;
    verification_date: Date;
    document_url: string;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export type EmployeeDocumentationRow = Selectable<EmployeeDocumentationTable>;
export type InsertableEmployeeDocumentationRow = Insertable<EmployeeDocumentationTable>;
export type UpdateableEmployeeDocumentationRow = Updateable<EmployeeDocumentationTable>;
