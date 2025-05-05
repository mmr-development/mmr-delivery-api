// import { Database } from '../../database';
// import { Kysely, sql } from 'kysely';
// import { PartnerFilter, PartnerListing } from './partner.schema';

// export interface PartnerService {
// getPartners(filters: PartnerFilter): Promise<PartnerListing>;
// }

// export function createPartnerService(db: Kysely<Database>): PartnerService {
// return {
//     getPartners: async function (filters: PartnerFilter): Promise<PartnerListing> {
//         let baseQuery = db.selectFrom('partner as p')
//             .leftJoin('partner_hour as ph', (join) =>
//                 join.onRef('ph.partner_id', '=', 'p.id')
//                     .on('ph.day_of_week', '=', sql`EXTRACT(DOW FROM NOW())`)
//             )
//             .leftJoin('business_type as bt', 'p.business_type_id', 'bt.id');
    
//         // Apply filters
//         if (filters.open_now) {
//             baseQuery = baseQuery.where(eb =>
//                 eb.between(
//                     sql`NOW()`,
//                     eb.ref('ph.opens_at'),
//                     eb.ref('ph.closes_at')
//                 )
//             );
//         }
    
//         // Get total count for pagination
//         const countResult = await baseQuery
//             .select(eb => eb.fn.countAll().as('count'))
//             .executeTakeFirst();
        
//         const total_count = Number(countResult?.count || 0);
        
//         // Apply pagination
//         const page = filters.page || 1;
//         const limit = filters.limit || 10;
//         const offset = (page - 1) * limit;
        
//         // Get paginated results
//         const partners = await baseQuery
//             .select([
//                 'p.id',
//                 'p.name',
//                 'p.created_at',
//                 'p.updated_at'
//                 'ph.opens_at',
//                 'ph.closes_at',
//             ])
//             .distinct()
//             .limit(limit)
//             .offset(offset)
//             .execute();
        
//         // Return in the expected format
//         return {
//             page,
//             limit,
//             total_count,
//             partners: partners
//         };
//     }
// }
// }