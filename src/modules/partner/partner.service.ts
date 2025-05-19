import { Database } from '../../database';
import { Kysely, sql } from 'kysely';
import { PartnerFilter, PartnerListing } from './partner.schema';
import { PartnerRow } from './partner.table';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export interface PartnerService {
    getPartners(filters: PartnerFilter): Promise<PartnerListing>;
    findPartnerByUserId(userId: string): Promise<any[]>;
    findPartnerById(id: number): Promise<PartnerRow | undefined>;
    savePartnerLogo(partnerId: number, originalFilename: string, fileBuffer: Buffer): Promise<string>;
    savePartnerBanner(partnerId: number, originalFilename: string, fileBuffer: Buffer): Promise<string>;
}

export function createPartnerService(db: Kysely<Database>): PartnerService {
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

            // Apply filters
            if (cityIds.length > 0) {
                baseQuery = baseQuery.where('c.id', 'in', cityIds);
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
                    'p.status',
                    'p.phone_number',
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
                logo_url: partner.logo_url,
                banner_url: partner.banner_url,
                phone_number: partner.phone_number,
                status: partner.status,
                delivery: {
                    fee: partner.delivery_fee,
                    min_order_value: partner.min_order_value,
                    max_distance_km: partner.max_delivery_distance_km
                },
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

            // Update partner record in database with logo URL - add /public prefix
            const imageUrl = `/public/uploads/partners/${partnerId}/${filename}`;
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

            // Update partner record in database with banner URL - add /public prefix
            const imageUrl = `/public/uploads/partners/${partnerId}/${filename}`;
            await db.updateTable('partner')
                .set({ banner_url: imageUrl })
                .where('id', '=', partnerId)
                .execute();

            return imageUrl;
        }
    }
}
