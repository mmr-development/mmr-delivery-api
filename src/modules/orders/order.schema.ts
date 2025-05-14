import { FastifySchema } from 'fastify';
import { Type, Static } from '@sinclair/typebox';

export const PaymentMethodEnum = Type.Union([
  Type.Literal('credit_card'),
  Type.Literal('debit_card'),
  Type.Literal('paypal'),
  Type.Literal('mobile_pay'),
]);

export const OrderStatusEnum = Type.Union([
  Type.Literal('pending'),
  Type.Literal('confirmed'),
  Type.Literal('preparing'),
  Type.Literal('ready'),
  Type.Literal('dispatched'),
  Type.Literal('delivered'),
  Type.Literal('cancelled'),
  Type.Literal('failed'),
  Type.Literal('refunded')
]);

export const DeliveryTypeEnum = Type.Union([
  Type.Literal('pickup'),
  Type.Literal('delivery'),
]);

export const CustomerSchema = Type.Object({
  first_name: Type.String(),
  last_name: Type.String(),
  email: Type.String(),
  phone_number: Type.String(),
  address: Type.Object({
    country: Type.String(),
    city: Type.String(),
    street: Type.String(),
    postal_code: Type.String(),
    address_detail: Type.Optional(Type.String()),
    latitude: Type.Optional(Type.Number()),
    longitude: Type.Optional(Type.Number()),
  }),
});

// OrderSchema
export const OrderSchema = Type.Object({
  partner_id: Type.Number(),
  delivery_type: DeliveryTypeEnum,
  requested_delivery_time: Type.Unsafe<Date>({ format: 'date-time' }),
  tip_amount: Type.Number(),
  customer_note: Type.Optional(Type.String()),
  items: Type.Array(
    Type.Object({
      catalog_item_id: Type.Number(),
      quantity: Type.Number(),
      note: Type.Optional(Type.String()),
    }),
  ),
});

export const CreateOrderSchema = Type.Object({
  customer: CustomerSchema,
  order: OrderSchema,
  payment: Type.Object({
    method: PaymentMethodEnum
  }),
})

export const CreateOrderResponseSchema = Type.Object({
  message: Type.String(),
});

export type CreateOrderResponse = Static<typeof CreateOrderResponseSchema>;
export type CreateOrderRequest = Static<typeof CreateOrderSchema>;

export const createOrderSchema: FastifySchema = {
  body: CreateOrderSchema,
  response: {
    201: CreateOrderResponseSchema,
  }
};
