import { Generated } from 'kysely';

export interface TimeEntryRow {
  id: Generated<number>;
  courier_id: number;
  schedule_id: number | null;
  clock_in: Date;
  clock_out: Date | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}
