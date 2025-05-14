import { PaymentMethod } from "../../payment/payment.table";

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'dispatched'
  | 'delivered'
  | 'cancelled'
  | 'failed'
  | 'refunded';

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
    price: number;
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

  export interface CreateOrderRequest {
    customer: {
      first_name: string;
      last_name: string;
      email: string;
      phone_number: string;
      address: {
        country: string;
        country_iso: string;
        city: string;
        street: string;
        postal_code: string;
        address_detail?: string;
        latitude?: number;
        longitude?: number;
      };
    };
    order: {
      partner_id: number;
      delivery_type: 'pickup' | 'delivery';
      payment_method: PaymentMethod;
      requested_delivery_time: Date;
      tip_amount?: string | number;
      customer_note?: string;
      order_status?: string;
      items: Array<{
        catalog_item_id: number;
        quantity: number;
        note?: string;
      }>;
    };
  }