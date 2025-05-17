import { Partner } from '../partner';
import { PartnerApplicationResponse } from '../partner.schema';
import { PartnerRow, PartnerWithRelationsRow } from '../partner.table';

/**
 * Maps a partner row to a Partner domain model
 */
export function partnerRowToPartner(partner: PartnerRow): Partner {
  return {
    id: partner.id,
    name: partner.name,
    phone_number: partner.phone_number || '',
    status: partner.status || null,
    delivery_method_id: partner.delivery_method_id,
    business_type_id: partner.business_type_id,
    user_id: partner.user_id,
  };
}

/**
 * Maps a partner row with relations to a PartnerApplicationResponse
 */
export function mapRowToApplicationResponse(row: PartnerWithRelationsRow): PartnerApplicationResponse {
  return {
    id: row.id,
    name: row.name,
    phone_number: row.phone_number || '',
    status: row.status || 'pending',
    delivery_method: {
      id: row.delivery_method_id || 0,
      name: row.delivery_method_name || ''
    },
    business_type: {
      id: row.business_type_id || 0,
      name: row.business_type_name || ''
    },
    contact_person: {
      id: row.user_id || '',
      first_name: row.first_name || '',
      last_name: row.last_name || '',
      email: row.user_email || '',
      phone_number: row.phone_number || ''
    },
    address: {
      street: row.street || '',
      city: row.city || '',
    //   address_detail: row.address_detail || '',
      postal_code: row.postal_code || '',
      country: row.country || ''
    },
  };
}
