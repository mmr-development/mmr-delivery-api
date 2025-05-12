import { AddressService } from "../../address";
import { UserService } from "../../users";
import { InsertableSchedulePreferenceRow, UpdateableSchedulePreferenceRow, SchedulePreferenceRow } from "./schedule-preference.table";
import { SchedulePreferenceRepository } from "./schedule-preference.repository";
import { SchedulePreference, UpdateSchedulePreference } from "./schedule-preference.schema";

export interface SchedulePreferenceService {
    createSchedulePreference(schedulePreference: SchedulePreference): Promise<void>;
    findAllSchedulePreferences(): Promise<{ schedule_preferences: SchedulePreference[] } | undefined>;
    findSchedulePreferenceById(id: number): Promise<SchedulePreference | undefined>;
    updateSchedulePreference(id: number, schedulePreference: UpdateSchedulePreference): Promise<SchedulePreference>;
    deleteSchedulePreference(id: number): Promise<void>;
}

export function createSchedulePreferenceService(repository: SchedulePreferenceRepository): SchedulePreferenceService {
    return {
        createSchedulePreference: async function (schedulePreference: SchedulePreference): Promise<void> {
            await repository.create(schedulePreference);
        },
        findAllSchedulePreferences: async function(): Promise<{ schedule_preferences: SchedulePreference[] } | undefined> {
            const schedulePreferencesRow = await repository.findAll();
            if(schedulePreferencesRow) {
                return { schedule_preferences: schedulePreferencesRow.map(row => schedulePreferenceRowToSchedulePreference(row)) }
            }
        },
        findSchedulePreferenceById: async function (id: number): Promise<SchedulePreference | undefined> {
            const schedulePreferenceRow = await repository.findById(id);
            if (schedulePreferenceRow) {
                return schedulePreferenceRowToSchedulePreference(schedulePreferenceRow);
            }
        },
        updateSchedulePreference: async function (id: number, schedulePreference: UpdateSchedulePreference): Promise<SchedulePreference> {
            const updatedRow = await repository.update(id, schedulePreference);
            return schedulePreferenceRowToSchedulePreference(updatedRow);
        },
        deleteSchedulePreference: async function (id: number): Promise<void> {
            await repository.delete(id);
        },
    }
}

export function schedulePreferenceRowToSchedulePreference(row: SchedulePreferenceRow): SchedulePreference {
    return {
        id: row.id,
        name: row.name,
        description: row.description || '',
    };
}
