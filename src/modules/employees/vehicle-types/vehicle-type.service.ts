import { Kysely } from 'kysely';
import { Database } from '../../../database';
import { CreateVehicleTypeRequest, VehicleType } from './vehicle-type.schema';
import { VehicleTypeRow, UpdateableVehicleTypeRow } from './vehicle-type.table';
// import { UpdateablePartnerRow } from '../partner.table';

export interface VehicleTypeService {
    createVehicleType(VehicleType: CreateVehicleTypeRequest): Promise<VehicleType>;
    getVehicleTypes(): Promise<{ vehicle_types: VehicleType[] }>;
    getVehicleTypeById(id: number): Promise<VehicleType>;
    updateVehicleType(id: number, VehicleType: CreateVehicleTypeRequest): Promise<VehicleType>;
    deleteVehicleType(id: number): Promise<void>;
}

export function createVehicleTypeService(db: Kysely<Database>): VehicleTypeService {
    return {
        createVehicleType: async function (VehicleType: CreateVehicleTypeRequest): Promise<VehicleType> {
            const createdVehicleType = await db
                .insertInto('vehicle_type')
                .values(VehicleType)
                .returningAll()
                .executeTakeFirstOrThrow();

            return VehicleTypeRowToVehicleType(createdVehicleType);
        },
        getVehicleTypes: async function (): Promise<{ vehicle_types: VehicleType[] }> {
            const VehicleTypes = await db
                .selectFrom('vehicle_type')
                .selectAll()
                .execute();
            
                return { vehicle_types: VehicleTypes.map(VehicleTypeRowToVehicleType) };
        },
        getVehicleTypeById: async function (id: number): Promise<VehicleType> {
            const VehicleType = await db
                .selectFrom('vehicle_type')
                .selectAll()
                .where('id', '=', id)
                .executeTakeFirstOrThrow();

            return VehicleTypeRowToVehicleType(VehicleType);
        },
        updateVehicleType: async function (id: number, updateWith: UpdateableVehicleTypeRow): Promise<VehicleType> {
            const updatedVehicleType = await db
                .updateTable('vehicle_type')
                .set(updateWith)
                .where('id', '=', id)
                .returningAll()
                .executeTakeFirstOrThrow();

            return VehicleTypeRowToVehicleType(updatedVehicleType);
        },
        deleteVehicleType: async function (id: number): Promise<void> {
            await db
                .deleteFrom('vehicle_type')
                .where('id', '=', id)
                .execute();
        },
    };
}

export function VehicleTypeRowToVehicleType(VehicleType: VehicleTypeRow): VehicleType {
    return {
        id: VehicleType.id,
        name: VehicleType.name,
    };
}
