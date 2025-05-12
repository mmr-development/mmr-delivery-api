import { Kysely } from 'kysely';
import { Database } from '../../../database';
import { CreateBusinessTypeRequest, BusinessType } from './business-type';
import { BusinessTypeRow } from './business-type.table';

export interface BusinessTypeService {
    createBusinessType(businessType: CreateBusinessTypeRequest): Promise<BusinessType>;
    getBusinessTypes(): Promise<{ business_types: BusinessType[] }>;
    getBusinessTypeById(id: number): Promise<BusinessType>;
    updateBusinessType(id: number, businessType: CreateBusinessTypeRequest): Promise<BusinessType>;
    deleteBusinessType(id: number): Promise<void>;
}

export function createBusinessTypeService(db: Kysely<Database>): BusinessTypeService {
    return {
        createBusinessType: async function (businessType: CreateBusinessTypeRequest): Promise<BusinessType> {
            const createdBusinessType = await db
                .insertInto('business_type')
                .values(businessType)
                .returningAll()
                .executeTakeFirstOrThrow();

            return businessTypeRowToBusinessType(createdBusinessType);
        },

        getBusinessTypes: async function (): Promise<{ business_types: BusinessType[] }> {
            const businessTypes = await db
                .selectFrom('business_type')
                .selectAll()
                .execute();

            return { business_types: businessTypes.map(businessTypeRowToBusinessType) };
        },

        getBusinessTypeById: async function (id: number): Promise<BusinessType> {
            const businessType = await db
                .selectFrom('business_type')
                .selectAll()
                .where('id', '=', id)
                .executeTakeFirstOrThrow();

            return businessTypeRowToBusinessType(businessType);
        },

        updateBusinessType: async function (id: number, updateWith: CreateBusinessTypeRequest): Promise<BusinessType> {
            const updatedBusinessType = await db
                .updateTable('business_type')
                .set(updateWith)
                .where('id', '=', id)
                .returningAll()
                .executeTakeFirstOrThrow();

            return businessTypeRowToBusinessType(updatedBusinessType);
        },

        deleteBusinessType: async function (id: number): Promise<void> {
            await db
                .deleteFrom('business_type')
                .where('id', '=', id)
                .execute();
        },
    };
}

export function businessTypeRowToBusinessType(businessType: BusinessTypeRow): BusinessType {
    return {
        id: businessType.id,
        name: businessType.name,
    };
}