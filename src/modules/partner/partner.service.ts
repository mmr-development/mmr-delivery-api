import { Database } from '../../database';
import { Kysely, sql } from 'kysely';
import { PartnerFilter, PartnerListing } from './partner.schema';
import { PartnerRow } from './partner.table';

export interface PartnerService {
    getPartners(filters: PartnerFilter): Promise<PartnerListing>;
    findPartnerByUserId(userId: string): Promise<any>;
    findPartnerById(id: number): Promise<PartnerRow | undefined>;
}

export function createPartnerService(db: Kysely<Database>): PartnerService {
    return {
        getPartners: async function (filters: PartnerFilter): Promise<PartnerListing> {
            let limit = filters.limit ?? 0;
            let offset = filters.offset ?? 0;
            let cityIds: number[] = [];

            if (filters.city && filters.city.trim()) {
                const cityMainPart = filters.city.split(' ')[0].trim();
                
                const matchingCities = await db
                    .selectFrom('city')
                    .select(['id'])
                    .where('name', 'ilike', `${cityMainPart}%`)
                    .execute();
                    
                cityIds = matchingCities.map(c => c.id);
                
                if (cityIds.length === 0) {
                    return { partners: [] };
                }
            }
        
            // Step 2: Build the base query for partners
            let baseQuery = db.selectFrom('partner as p')
                .leftJoin('business_type as bt', 'p.business_type_id', 'bt.id')
                .leftJoin('address as a', 'p.address_id', 'a.id')
                .leftJoin('postal_code as pc', 'a.postal_code_id', 'pc.id')
                .leftJoin('city as c', 'pc.city_id', 'c.id')
                .leftJoin('country as co', 'c.country_id', 'co.id')
                .leftJoin('street as s', 'a.street_id', 's.id');
                
            // Apply filters
            if (cityIds.length > 0) {
                baseQuery = baseQuery.where('c.id', 'in', cityIds);
            }

            const partners = await baseQuery
                .selectAll()
                .select([
                    'p.id',
                    'p.name',
                    'p.business_type_id',
                    'bt.name as business_type_name',
                    'a.address_detail',
                    'pc.code as postal_code',
                    'c.name as city_name',
                    'co.name as country_name',
                    's.name as street_name',
                ])
                .offset(offset)
                .limit(limit > 0 ? limit : null)
                .execute();

            const formattedPartners = partners.map((partner) => ({
                id: partner.id,
                name: partner.name,
                business_type: {
                    id: partner.business_type_id || 0,
                    name: partner.business_type_name || ''
                },
                address: {
                    id: partner.address_id || 0,
                    address_detail: partner.address_detail || undefined,
                    street: partner.street_name || '',
                    city: partner.city_name || '',
                    postal_code: partner.postal_code || '',
                    country: partner.country_name || '',
                },
            }));

            return { 
                partners: formattedPartners,
                pagination: {
                    total: formattedPartners.length,
                    offset: filters.offset || 0,
                    limit: filters.limit || 0,
                }
            };
        },
        findPartnerByUserId: async function (userId: string): Promise<any> {
            const partner = await db
                .selectFrom('partner')
                .where('user_id', '=', userId)
                .selectAll()
                .executeTakeFirst();

            return partner;
        },
        findPartnerById: async function (id: number): Promise<PartnerRow | undefined> {
            const partner = await db
                .selectFrom('partner')
                .where('id', '=', id)
                .selectAll()
                .executeTakeFirst();

            return partner;
        }
    }
}
