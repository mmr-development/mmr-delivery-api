import { AddressService } from "../../address";
import { UserService } from "../../users";
import { InsertableHourPreferenceRow, UpdateableHourPreferenceRow, HourPreferenceRow } from "./hours-preference.table";
import { HourPreferenceRepository } from "./hours-preference.repository";
import { HourPreference, UpdateHourPreference } from "./hours-preference.schema";

export interface HourPreferenceService {
    createHourPreference(hourPreference: HourPreference): Promise<void>;
    findAllHourPreferences(): Promise<{ hour_preferences: HourPreference[] } | undefined>;
    findHourPreferenceById(id: number): Promise<HourPreference | undefined>;
    updateHourPreference(id: number, hourPreference: UpdateHourPreference): Promise<HourPreference>;
    deleteHourPreference(id: number): Promise<void>;
}

export function createHourPreferenceService(repository: HourPreferenceRepository): HourPreferenceService {
    return {
        createHourPreference: async function (hourPreference: HourPreference): Promise<void> {
            await repository.create(hourPreference);
        },
        findAllHourPreferences: async function(): Promise<{ hour_preferences: HourPreference[] } | undefined> {
            const hourPreferencesRow = await repository.findAll();
            if(hourPreferencesRow) {
                return {
                    hour_preferences: hourPreferencesRow.map(row => hourPreferenceRowToHourPreference(row))
                };
            }
        },
        findHourPreferenceById: async function (id: number): Promise<HourPreference | undefined> {
            const hourPreferenceRow = await repository.findById(id);
            if (hourPreferenceRow) {
                return hourPreferenceRowToHourPreference(hourPreferenceRow);
            }
        },
        updateHourPreference: async function (id: number, hourPreference: UpdateHourPreference): Promise<HourPreference> {
            const updatedRow = await repository.update(id, hourPreference);
            return hourPreferenceRowToHourPreference(updatedRow);
        },
        deleteHourPreference: async function (id: number): Promise<void> {
            await repository.delete(id);
        },
    }
}

export function hourPreferenceRowToHourPreference(row: HourPreferenceRow): HourPreference {
    return {
        id: row.id,
        name: row.name,
        description: row.description || '',
    };
}
