import { OrderWithDetailsRow } from './order.table';
import { OrderDetails } from './order.schema';

export function mapOrderRowToDetails(row: OrderWithDetailsRow): OrderDetails {
  // Transform order items
  const formattedItems = Array.isArray(row.items) 
    ? row.items.map(item => ({
        catalog_item_id: item.catalog_item_id,
        quantity: item.quantity,
        note: item.note || undefined,
        price: item.price,
        name: item.item_name
      }))
    : [];
    
  // Return the mapped order details
  return {
    id: row.order_id,
    partner_id: row.partner_id,
    customer: {
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      phone_number: row.phone_number,
      address: {
        country: row.country,
        city: row.city,
        street: row.street,
        postal_code: row.postal_code,
        address_detail: row.address_detail || undefined
      }
    },
    delivery_type: row.delivery_type,
    status: row.status,
    requested_delivery_time: row.requested_delivery_time,
    tip_amount: Number(row.tip_amount),
    total_amount: Number(row.total_amount),
    total_items: row.total_items,
    note: row.note || undefined,
    items: formattedItems,
    payment: {
      method: row.payment_method || 'unknown',
      status: row.status || 'pending',
    },
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
