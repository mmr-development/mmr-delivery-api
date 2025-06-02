import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface CourierScheduleTable {
    id: Generated<number>;
    courier_id: number;
    start_datetime: Date;
    end_datetime: Date;
    status: 'scheduled' | 'confirmed' | 'completed' | 'canceled' | 'vacation';
    notes: string | null;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export interface TimeEntryTable {
    id: Generated<number>;
    courier_id: number;
    schedule_id: number | null;
    clock_in: Date;
    clock_out: Date | null;
    notes: string | null;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export type CourierScheduleRow = Selectable<CourierScheduleTable>;
export type InsertableCourierScheduleRow = Insertable<CourierScheduleTable>;
export type UpdateableCourierScheduleRow = Updateable<CourierScheduleTable>;

export type TimeEntryRow = Selectable<TimeEntryTable>;
export type InsertableTimeEntryRow = Insertable<TimeEntryTable>;
export type UpdateableTimeEntryRow = Updateable<TimeEntryTable>;
