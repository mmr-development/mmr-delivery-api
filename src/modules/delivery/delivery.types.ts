import { Generated } from 'kysely';

// Delivery status type from the database enum
export type DeliveryStatus = 
  | 'assigned'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'failed'
  | 'canceled';

// Basic database row types
export interface DeliveryRow {
  id: Generated<number>;
  order_id: number;
  courier_id: string;
  status: DeliveryStatus;
  assigned_at: Generated<Date>;
  picked_up_at: Date | null;
  delivered_at: Date | null;
  estimated_delivery_time: Date | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface CourierLocationRow {
  id: Generated<number>;
  courier_id: string;
  latitude: number;
  longitude: number;
  timestamp: Generated<Date>;
}

// WebSocket connection tracking
export interface CourierConnection {
  courierId: string;
  socket: any; // Using 'any' for WebSocket since it's implementation-specific
  lastActive: Date;
}

// Message types for WebSocket communication
export interface DeliveryMessage {
  type: 'delivery_assigned' | 'status_update' | 'location_update' | 'error' | 'heartbeat';
  payload?: any;
  timestamp: string;
}
