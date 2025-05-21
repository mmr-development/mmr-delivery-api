import { CourierRepository, CourierWithUserRow } from './courier.repository';
import { EmployeeRow } from '../employee.table';

export interface CreateCourierRequest {
    user_id: string;
    vehicle_type_id: number;
    address_id: number;
    schedule_preference_id: number;
    hours_preference_id: number;
    data_retention_consent: boolean;
    is_eighteen_plus: boolean;
    status: string;
}

export interface Courier {
    id: number;
    user_id: string;
    vehicle_type_id: number;
    address_id: number;
    schedule_preference_id: number;
    hours_preference_id: number;
    data_retention_consent: boolean;
    is_eighteen_plus: boolean;
    status: string;
    created_at: Date;
    updated_at: Date;
}

export interface CourierDetails extends Courier {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
}

export interface CreateCourierResponse {
    courier: Courier;
}

export interface GetCouriersOptions {
    user_id?: string;
    status?: string;
    offset?: number;
    limit?: number;
}

export interface CourierService {
    createCourier(request: CreateCourierRequest): Promise<CreateCourierResponse>;
    getCouriers(query: GetCouriersOptions): Promise<{ couriers: Courier[]; total: number; limit?: number; offset?: number }>;
    getCourierById(id: number): Promise<Courier | null>;
    updateCourier(id: number, request: Partial<CreateCourierRequest>): Promise<Courier>;
    deleteCourier(id: number): Promise<void>;
}

export function createCourierService(repository: CourierRepository): CourierService {
    return {
        async createCourier(request: CreateCourierRequest): Promise<CreateCourierResponse> {
            const courier = await repository.createCourier(request);
            return {
                courier: courierRowToCourier(courier),
            };
        },
        async getCouriers(query: GetCouriersOptions): Promise<{ couriers: Courier[]; total: number; limit?: number; offset?: number }> {
            const { couriers, total } = await repository.getCouriers(query);
            return {
                couriers: couriers.map(courierWithUserToModel),
                total,
                limit: query.limit,
                offset: query.offset,
            };
        },
        async getCourierById(id: number): Promise<CourierDetails | null> {
            const courier = await repository.getCourierById(id);
            if (!courier) return null;
            return courierWithUserToModel(courier);
        },
        async updateCourier(id: number, request: Partial<CreateCourierRequest>): Promise<Courier> {
            const courier = await repository.updateCourier(id, request);
            return courierRowToCourier(courier);
        },
        async deleteCourier(id: number): Promise<void> {
            await repository.deleteCourier(id);
        }
    };
}

export function courierRowToCourier(row: EmployeeRow): Courier {
    return {
        id: row.id,
        user_id: row.user_id,
        vehicle_type_id: row.vehicle_type_id,
        address_id: row.address_id,
        schedule_preference_id: row.schedule_preference_id,
        hours_preference_id: row.hours_preference_id,
        data_retention_consent: row.data_retention_consent,
        is_eighteen_plus: row.is_eighteen_plus,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export function courierWithUserToModel(row: CourierWithUserRow): CourierDetails {
    return {
        ...courierRowToCourier(row),
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        phone_number: row.phone_number
    };
}