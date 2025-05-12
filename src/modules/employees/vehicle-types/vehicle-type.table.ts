import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface VehicleTypeTable {
    id: Generated<number>;
    name: string;
}

export type VehicleTypeRow = Selectable<VehicleTypeTable>;
export type InsertableVehicleTypeRow = Insertable<VehicleTypeTable>;
export type UpdateableVehicleTypeRow = Updateable<VehicleTypeTable>;
