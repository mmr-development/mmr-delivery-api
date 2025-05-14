
export type OrderDeliveryType = 'pickup' | 'delivery';

export interface OrderData {
    partner_id: number;
    customer_id: number;
    order_status: string;
    delivery_type: string;
    requested_delivery_time: Date;
    tip_amount: string | number;
    total_amount: string | number;
    customer_note?: string;
  }
  
  export interface OrderItemData {
    catalog_item_id: number;
    quantity: number;
    price?: number;
    note?: string;
  }
  
  export interface CreatedOrder {
    id: number;
    partner_id: number;
    customer_id: number;
    status: string;
    delivery_type: string;
    requested_delivery_time: Date;
    tip_amount: string | number;
    customer_note?: string;
    total_amount: string | number;
    created_at: Date;
    updated_at: Date;
  }
  
  export interface CreatedOrderItem {
    id: number;
    order_id: number;
    catalog_item_id: number;
    quantity: number;
    price: number;
    created_at: string;
    updated_at: string;
  }