import { Type } from '@sinclair/typebox';

// Base schemas for reuse
const OrderItem = Type.Object({
  item_name: Type.String(),
  quantity: Type.Number(),
  price: Type.Number(),
  note: Type.Optional(Type.Union([Type.String(), Type.Null()]))
});

const Pickup = Type.Object({
  name: Type.String(),
  latitude: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  longitude: Type.Optional(Type.Union([Type.Number(), Type.Null()]))
});

const DeliveryLocation = Type.Object({
  customer_name: Type.String(),
  phone: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  address: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  latitude: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  longitude: Type.Optional(Type.Union([Type.Number(), Type.Null()]))
});

const Order = Type.Object({
  total_amount: Type.Number(),
  tip_amount: Type.Optional(Type.Number()),
  items: Type.Array(OrderItem)
});

const DeliveryItem = Type.Object({
  id: Type.Number(),
  order_id: Type.Number(),
  status: Type.String(),
  assigned_at: Type.String({ format: 'date-time' }),
  picked_up_at: Type.Optional(Type.Union([Type.String({ format: 'date-time' }), Type.Null()])),
  delivered_at: Type.Optional(Type.Union([Type.String({ format: 'date-time' }), Type.Null()])),
  estimated_delivery_time: Type.Optional(Type.Union([Type.String({ format: 'date-time' }), Type.Null()])),
  pickup: Type.Optional(Type.Union([Pickup, Type.Null()])),
  delivery: Type.Optional(Type.Union([DeliveryLocation, Type.Null()])),
  order: Type.Optional(Type.Union([Order, Type.Null()]))
});

// Response types
const CourierDeliveriesResponse = Type.Object({
  deliveries: Type.Array(DeliveryItem),
});

const ErrorResponse = Type.Object({
  success: Type.Literal(false),
  error: Type.String(),
  message: Type.String()
});

const DeliveryStatusUpdateResponse = Type.Object({
  success: Type.Literal(true),
  delivery: Type.Object({
    id: Type.Number(),
    order_id: Type.Number(),
    status: Type.String()
  })
});

// Export schema objects for route handlers
export const courierDeliveriesSchema = {
  tags: ['Delivery'],
  security: [{ bearerAuth: [] }],
  response: {
    200: CourierDeliveriesResponse,
    500: Type.Object({
      deliveries: Type.Array(Type.Object({})),
    })
  }
};

export const updateDeliveryStatusSchema = {
  tags: ['Delivery'],
  security: [{ bearerAuth: [] }],
  params: Type.Object({
    id: Type.Number()
  }),
  body: Type.Object({
    status: Type.Enum({
      assigned: 'assigned',
      picked_up: 'picked_up',
      in_transit: 'in_transit', 
      delivered: 'delivered',
      failed: 'failed',
      canceled: 'canceled'
    })
  }),
  response: {
    200: DeliveryStatusUpdateResponse,
    400: ErrorResponse,
    403: ErrorResponse,
    404: ErrorResponse
  }
};

export const courierStatusSchema = {
  tags: ['Delivery'],
  security: [{ bearerAuth: [] }],
  response: {
    200: Type.Object({
      courier_id: Type.String(),
      connected: Type.Boolean()
    })
  }
};