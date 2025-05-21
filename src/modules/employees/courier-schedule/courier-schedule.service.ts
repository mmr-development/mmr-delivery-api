import { ScheduleRepository } from './courier-schedule.repository';
import { CourierScheduleRow } from './schedule.table';

export interface CreateCourierScheduleRequest {
    courier_id: number;
    start_datetime: Date;
    end_datetime: Date;
    status: "scheduled" | "confirmed" | "completed" | "canceled";
    notes?: string | null;
}

interface Schedule {
    id: number;
    courier_id: number;
    start_datetime: Date;
    end_datetime: Date;
    status: string;
    notes?: string;
    created_at: Date;
    updated_at: Date;
}

export interface CreateCourierScheduleResponse {
    schedule: Schedule;
}

export interface GetSchedulesOptions {
    courier_id?: number;
    from_date?: Date;
    to_date?: Date;
    status?: "scheduled" | "confirmed" | "completed" | "canceled";
    offset?: number;
    limit?: number;
}

export interface CourierScheduleService {
    createSchedule(request: CreateCourierScheduleRequest): Promise<CreateCourierScheduleResponse>;
    getSchedules(query: GetSchedulesOptions): Promise<{ schedules: Schedule[]; total: number, limit?: number; offset?: number }>;
    getScheduleById(id: number): Promise<Schedule | null>;
    updateSchedule(id: number, request: Partial<CreateCourierScheduleRequest>): Promise<Schedule>;
    deleteSchedule(id: number): Promise<void>;
}

export function createCourierScheduleService(repository: ScheduleRepository): CourierScheduleService {
    return {
        async createSchedule(request: CreateCourierScheduleRequest): Promise<CreateCourierScheduleResponse> {
            const schedule = await repository.createSchedule(request);
            return {
                schedule: scheduleRowToSchedule(schedule),
            }
        },
        async getSchedules(query: GetSchedulesOptions): Promise<{ schedules: Schedule[]; total: number, limit?: number; offset?: number }> {
            const { schedules, total } = await repository.getSchedules(query);
            return {
                schedules: schedules.map(scheduleRowToSchedule),
                total: total,
                limit: query.limit,
                offset: query.offset
            }
        },
        async getScheduleById(id: number): Promise<Schedule | null> {
            const schedule = await repository.getScheduleById(id);
            if (!schedule) {
                return null;
            }
            return scheduleRowToSchedule(schedule);
        },
        async updateSchedule(id: number, request: Partial<CreateCourierScheduleRequest>): Promise<Schedule> {
            const schedule = await repository.updateSchedule(id, request);
            return scheduleRowToSchedule(schedule);
        },
        async deleteSchedule(id: number): Promise<void> {
            await repository.deleteSchedule(id);
        }
    };
}

export function scheduleRowToSchedule(row: CourierScheduleRow): Schedule {
    return {
        id: row.id,
        courier_id: row.courier_id,
        start_datetime: row.start_datetime,
        end_datetime: row.end_datetime,
        status: row.status,
        notes: row.notes ?? undefined,
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}
