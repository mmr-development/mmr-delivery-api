import { Kysely } from 'kysely';
import { Database } from '../../database';
import { UpdateableAddressRow } from './address.tables';

export interface AddressRepository {
    findOrCreateCountry(name: string, iso?: string): Promise<number>;
    findOrCreateCity(name: string, countryId: number): Promise<number>;
    findOrCreateStreet(name: string, cityId: number): Promise<number>;
    findOrCreatePostalCode(code: string, cityId: number): Promise<number>;
    findOrCreateAddress(streetId: number, addressDetail: string, postalCodeId: number, latitude: number, longitude: number): Promise<number>;
    updateAddress(addressId: number, data: Partial<UpdateableAddressRow>): Promise<void>;
    getUserAddressId(userId: string): Promise<number | null>;
    findAddressByDetails(details: {
        street: string;
        postal_code: string;
        city: string;
        country: string;
        address_detail?: string;
    }): Promise<{ id: number } | null>;
    getPartnerAddressId(partnerId: number): Promise<number | null>;
}

export function createAddressRepository(db: Kysely<Database>): AddressRepository {
    return {
        async findOrCreateCountry(name: string, iso?: string): Promise<number> {
            const existing = await db.selectFrom('country')
                .where('name', '=', name)
                .select('id')
                .executeTakeFirst();

            if (existing) return existing.id;

            const result = await db.insertInto('country')
                .values({ name, iso: iso || name.substring(0, 3).toUpperCase() })
                .returning('id')
                .executeTakeFirstOrThrow();

            return result.id;
        },
        async findOrCreateCity(name: string, countryId: number): Promise<number> {
            const existing = await db.selectFrom('city')
                .where('name', '=', name)
                .where('country_id', '=', countryId)
                .select('id')
                .executeTakeFirst();

            if (existing) return existing.id;

            const result = await db.insertInto('city')
                .values({ name, country_id: countryId })
                .returning('id')
                .executeTakeFirstOrThrow();

            return result.id;
        },
        async findOrCreateStreet(name: string): Promise<number> {
            const existing = await db.selectFrom('street')
                .where('name', '=', name)
                .select('id')
                .executeTakeFirst();

            if (existing) return existing.id;

            const result = await db.insertInto('street')
                .values({ name })
                .returning('id')
                .executeTakeFirstOrThrow();

            return result.id;
        },
        async findOrCreatePostalCode(code: string, cityId: number): Promise<number> {
            const existing = await db.selectFrom('postal_code')
                .where('code', '=', code)
                .where('city_id', '=', cityId)
                .select('id')
                .executeTakeFirst();

            if (existing) return existing.id;

            const result = await db.insertInto('postal_code')
                .values({
                    code,
                    city_id: cityId
                })
                .returning('id')
                .executeTakeFirstOrThrow();

            return result.id;
        },
        async updateAddress(addressId: number, data: Partial<UpdateableAddressRow>): Promise<void> {
            await db.updateTable('address')
                .set(data)
                .where('id', '=', addressId)
                .execute();
        },
        async findOrCreateAddress(streetId: number, addressDetail: string, postalCodeId: number, latitude: number, longitude: number): Promise<number> {
            const existing = await db.selectFrom('address')
                .where('street_id', '=', streetId)
                .where('address_detail', '=', addressDetail)
                .where('postal_code_id', '=', postalCodeId)
                .select('id')
                .executeTakeFirst();

            if (existing) return existing.id;

            const result = await db.insertInto('address')
                .values({
                    street_id: streetId,
                    address_detail: addressDetail,
                    postal_code_id: postalCodeId,
                    latitude: latitude,
                    longitude: longitude
                })
                .returning('id')
                .executeTakeFirstOrThrow();

            return result.id;
        },
        async getUserAddressId(userId: string): Promise<number | null> {
            const result = await db
                .selectFrom('customer')
                .select('address_id')
                .where('user_id', '=', userId)
                .executeTakeFirst();

            return result?.address_id ?? null;
        },
        async findAddressByDetails(details: {
            street: string;
            postal_code: string;
            city: string;
            country: string;
            address_detail?: string;
        }): Promise<{ id: number } | null> {
            const result = await db
                .selectFrom('address')
                .innerJoin('street', 'street.id', 'address.street_id')
                .innerJoin('postal_code', 'postal_code.id', 'address.postal_code_id')
                .innerJoin('city', 'city.id', 'postal_code.city_id')
                .innerJoin('country', 'country.id', 'city.country_id')
                .where('street.name', '=', details.street)
                .where('postal_code.code', '=', details.postal_code)
                .where('city.name', '=', details.city)
                .where('country.name', '=', details.country)
                .where('address.address_detail', '=', details.address_detail || '')
                .select('address.id')
                .executeTakeFirst();

            return result || null;
        },
        async getPartnerAddressId(partnerId: number): Promise<number | null> {
            const result = await db
                .selectFrom('partner')
                .select('address_id')
                .where('id', '=', partnerId) 
                .executeTakeFirst();

            return result?.address_id ?? null;
        }
    }
}
