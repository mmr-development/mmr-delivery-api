import { Kysely } from 'kysely';
import { Database } from '../../database';

export interface AddressRepository {
    findOrCreateCountry(name: string, iso?: string): Promise<number>;
    findOrCreateCity(name: string, countryId: number): Promise<number>;
    findOrCreateStreet(name: string, cityId: number): Promise<number>;
    findOrCreatePostalCode(code: string, cityId: number): Promise<number>;
    findOrCreateAddress(streetId: number, addressDetail: string, postalCodeId: number): Promise<number>;
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
        async findOrCreateAddress(streetId: number, addressDetail: string, postalCodeId: number): Promise<number> {
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
                    postal_code_id: postalCodeId
                })
                .returning('id')
                .executeTakeFirstOrThrow();
    
            return result.id;
        }
    }
}
