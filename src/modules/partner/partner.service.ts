import { Database } from '../../database';
import { Kysely, sql } from 'kysely';
import { PartnerFilter, PartnerListing } from './partner.schema';
import { PartnerDataModel, PartnerRow, UpdateablePartnerRow } from './partner.table';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { AddressService } from '../address';

export interface PartnerService {
    getPartners(filters: PartnerFilter): Promise<PartnerListing>;
    findPartnerByUserId(userId: string): Promise<any[]>;
    findPartnerById(id: number): Promise<PartnerRow | undefined>;
    findPartnerByIdWithAddress(id: number): Promise<PartnerDataModel | undefined>;
    savePartnerLogo(partnerId: number, originalFilename: string, fileBuffer: Buffer): Promise<string>;
    savePartnerBanner(partnerId: number, originalFilename: string, fileBuffer: Buffer): Promise<string>;
    updatePartner(id: number, updateWith: UpdateablePartnerRow): Promise<void>;
    updatePartnerAddress(id: number, address: {street?: string, postal_code?: string, city?: string, country?: string, address_detail?: string, latitude?: number, longitude?: number
    }): Promise<void>;
}

export function createPartnerService(db: Kysely<Database>, addressService: AddressService): PartnerService {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

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

            baseQuery = baseQuery.where('p.status', '=', 'approved');

            // Apply filters
            if (cityIds.length > 0) {
                baseQuery = baseQuery.where('c.id', 'in', cityIds);
            }

            if (filters.sort) {
                switch (filters.sort) {
                    case 'newest':
                        baseQuery = baseQuery.orderBy('pc.created_at', 'desc');
                        break;
                }
            }

            // Handle open_now filter with timezone support
            if (filters.open_now) {
                const timezone = filters.timezone || 'UTC';

                const now = new Date();

                const dayOfWeek = now.getDay();

                baseQuery = baseQuery
                    .innerJoin('partner_hour as ph', 'p.id', 'ph.partner_id')
                    .where('ph.day_of_week', '=', dayOfWeek)
                    .where(eb =>
                        eb('ph.opens_at', '<=', sql<string>`(CURRENT_TIME AT TIME ZONE ${timezone})::time`)
                            .and('ph.closes_at', '>=', sql<string>`(CURRENT_TIME AT TIME ZONE ${timezone})::time`)
                    )
                    .distinct();
            }

            const partners = await baseQuery
                .select([
                    'p.id',
                    'p.name',
                    'p.business_type_id',
                    'p.logo_url',
                    'p.banner_url',
                    'p.delivery_fee',
                    'p.min_order_value',
                    'p.max_delivery_distance_km',
                    'p.min_preparation_time_minutes',
                    'p.max_preparation_time_minutes',
                    'p.phone_number',
                    'bt.name as business_type_name',
                    'a.address_detail',
                    'pc.code as postal_code',
                    'c.name as city_name',
                    'co.name as country_name',
                    's.name as street_name',
                    'pc.created_at',
                    sql<string>`
                    COALESCE(
                        (
                            SELECT jsonb_agg(
                                jsonb_build_object(
                                    'day', ph.day_of_week,
                                    'opens_at', ph.opens_at,
                                    'closes_at', ph.closes_at
                                )
                                ORDER BY ph.day_of_week
                            )
                            FROM partner_hour ph
                            WHERE ph.partner_id = p.id
                        ), '[]'::jsonb
                    )
                `.as('opening_hours')
                ])
                .offset(offset)
                .limit(limit > 0 ? limit : null)
                .execute();

            const formattedPartners = partners.map((partner) => ({
                id: partner.id,
                name: partner.name,
                logo_url: partner.logo_url,
                banner_url: partner.banner_url,
                phone_number: partner.phone_number,
                created_at: partner.created_at,
                delivery: {
                    fee: partner.delivery_fee,
                    min_order_value: partner.min_order_value,
                    max_distance_km: partner.max_delivery_distance_km,
                    min_preparation_time_minutes: partner.min_preparation_time_minutes,
                    max_preparation_time_minutes: partner.max_preparation_time_minutes,
                },
                business_type: {
                    name: partner.business_type_name || ''
                },
                address: {
                    address_detail: partner.address_detail || undefined,
                    street: partner.street_name || '',
                    city: partner.city_name || '',
                    postal_code: partner.postal_code || '',
                    country: partner.country_name || '',
                },
                opening_hours: partner.opening_hours || [],
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
        findPartnerByUserId: async function (userId: string): Promise<any[]> {
            const partner = await db
                .selectFrom('partner')
                .where('user_id', '=', userId)
                .selectAll()
                .execute();

            return partner;
        },
        findPartnerById: async function (id: number): Promise<PartnerRow | undefined> {
            const partner = await db
                .selectFrom('partner')
                .where('id', '=', id)
                .selectAll()
                .executeTakeFirst();

            return partner;
        },
        findPartnerByIdWithAddress: async function (id: number): Promise<PartnerDataModel | undefined> {
            return await db
                .selectFrom('partner as p')
                .leftJoin('address as a', 'p.address_id', 'a.id')
                .leftJoin('street as s', 'a.street_id', 's.id')
                .leftJoin('postal_code as pc', 'a.postal_code_id', 'pc.id')
                .leftJoin('city as c', 'pc.city_id', 'c.id')
                .leftJoin('country as co', 'c.country_id', 'co.id')
                .select([
                    'p.id as partner_id',
                    'p.name',
                    'a.id as address_id',
                    's.name as street',
                    'a.address_detail',
                    'pc.code as postal_code',
                    'c.name as city',
                    'co.name as country'
                ])
                .where('p.id', '=', id)
                .executeTakeFirst();
        },
        savePartnerLogo: async function (partnerId: number, originalFilename: string, fileBuffer: Buffer): Promise<string> {
            const partner = await this.findPartnerById(partnerId);
            if (!partner) {
                throw new Error('Partner not found');
            }

            // Generate unique filename
            const fileExtension = path.extname(originalFilename);
            const randomString = crypto.randomBytes(8).toString('hex');
            const filename = `logo_${partnerId}_${randomString}${fileExtension}`;

            // Create directory for this partner if needed - FIXED PATH
            const partnerDir = path.join(process.cwd(), 'public', 'uploads', 'partners', partnerId.toString());
            await fs.mkdir(partnerDir, { recursive: true });

            // Write file
            const filePath = path.join(partnerDir, filename);
            await fs.writeFile(filePath, fileBuffer);

            // Update partner record in database with logo URL
            const imageUrl = `/uploads/partners/${partnerId}/${filename}`;
            await db.updateTable('partner')
                .set({ logo_url: imageUrl })
                .where('id', '=', partnerId)
                .execute();

            return imageUrl;
        },
        savePartnerBanner: async function (partnerId: number, originalFilename: string, fileBuffer: Buffer): Promise<string> {
            const partner = await this.findPartnerById(partnerId);
            if (!partner) {
                throw new Error('Partner not found');
            }

            // Generate unique filename
            const fileExtension = path.extname(originalFilename);
            const randomString = crypto.randomBytes(8).toString('hex');
            const filename = `banner_${partnerId}_${randomString}${fileExtension}`;

            // Create directory for this partner if needed - FIXED PATH
            const partnerDir = path.join(process.cwd(), 'public', 'uploads', 'partners', partnerId.toString());
            await fs.mkdir(partnerDir, { recursive: true });

            // Write file
            const filePath = path.join(partnerDir, filename);
            await fs.writeFile(filePath, fileBuffer);

            // Update partner record in database with banner URL
            const imageUrl = `/uploads/partners/${partnerId}/${filename}`;
            await db.updateTable('partner')
                .set({ banner_url: imageUrl })
                .where('id', '=', partnerId)
                .execute();

            return imageUrl;
        },
        async updatePartner(id: number, updateWith: UpdateablePartnerRow): Promise<void> {
            await db.updateTable('partner')
                .set(updateWith)
                .where('id', '=', id)
                .execute();
        },
        updatePartnerAddress: async function(id: number, address: any): Promise<void> {
            const partner = await this.findPartnerById(id);
            if (!partner) {
                throw new Error('Partner not found');
            }

            try {
                const addressId = await addressService.createOrUpdateAddress(
                    id.toString(),
                    address,
                    'partner'
                );
                
                await db.updateTable('partner')
                    .set({ address_id: addressId })
                    .where('id', '=', id)
                    .execute();
                    
                console.log(`Partner ${id} address updated successfully with address ID ${addressId}`);
            } catch (error) {
                console.error('Failed to update partner address:', error);
                throw new Error('Failed to update partner address');
            }
        }
    }
}
