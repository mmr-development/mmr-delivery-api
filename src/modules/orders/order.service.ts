import { OrdersRepository } from './order.repository';
import { UserService } from '../users/user.service';
import { AddressService } from '../address';
import { CreateOrderRequest, CreateOrderResponse, GetOrdersQuery, OrderDetails } from './order.schema';
import { CustomerService } from '../customer/customer.service';
import { PaymentService } from '../payment/payment.service';
import { CatalogService } from '../partner/catalog';
import { PartnerService } from '../partner/partner.service';
import { ControllerError } from '../../utils/errors';
import { broadcastOrderStatusUpdate } from './order.ws';
import { mapOrderRowFromPartnerQuery, mapOrderRowsFromPartnerQuery, mapOrderRowToDetails } from './order-mapper';
import { OrderItemService } from './order-item.service';
import { CustomerAdapter } from './customer.adapter';
import { DeliveryService } from '../delivery/delivery.service';
import { broadcastPartnerMessage } from '../partner/partner.ws';
import { PushNotificationService } from '../push-notifications/push-notification.service';

interface OrderUpdateData {
  status?: string;
  requested_delivery_time?: Date;
  note?: string;
  [key: string]: any;
}

export interface OrderService {
  createOrder(order: CreateOrderRequest): Promise<CreateOrderResponse>;
  findOrders(options?: GetOrdersQuery): Promise<{
    orders: OrderDetails[],
    pagination: { total: number, limit?: number, offset?: number }
  }>;
  findOrderById(orderId: number): Promise<OrderDetails | null>;
  updateOrder(orderId: number, orderData: OrderUpdateData): Promise<OrderDetails>;
  findOrdersByPartnerId(partnerId: number): Promise<any | null>;
  notifyCustomerOfOrderUpdate(orderId: number, status: string): Promise<void>;
  notifyCustomerOfDeliveryAssignment(orderId: number, deliveryId: number): Promise<void>;
  findOrdersByCustomerId?(customerId: number): Promise<OrderDetails[]>;
  getOrderCustomerEmail(orderId: number): Promise<string | null>;
  getOrdersAndCustomerEmailByOrderId(orderId: number): Promise<{ order: OrderDetails | null, customerEmail: string | null }>;
  getDeliveryByOrderId(orderId: number): Promise<any | null>;
  getOrderAndCustomerDetails(orderId: number): Promise<any | null>;
  getOrderStatistics(partnerId?: number, options?: { startDate?: Date, endDate?: Date }): Promise<any>;
}

export function createOrderService(
  ordersRepository: OrdersRepository,
  userService: UserService,
  addressService: AddressService,
  customerService: CustomerService,
  paymentService: PaymentService,
  catalogService: CatalogService,
  partnerService: PartnerService,
  pushNotificationService: PushNotificationService,
  deliveryService?: DeliveryService,
): OrderService {
  // Create helper services
  const itemService = new OrderItemService(catalogService, ordersRepository);
  const customerAdapter = new CustomerAdapter(userService, addressService, customerService);

  return {
    async createOrder(order: CreateOrderRequest): Promise<CreateOrderResponse> {
      // Verify partner exists
      const partner = await partnerService.findPartnerById(order.order.partner_id);
      if (!partner) {
        throw new ControllerError(404, 'PartnerNotFound', 'Partner not found');
      }

      // Process customer and items in parallel
      const [customerId, itemsResult] = await Promise.all([
        customerAdapter.prepareForOrder(order.customer),
        itemService.processItems(order.order.items, order.order.tip_amount)
      ]);

      let deliveryFee = 0;
      if (order.order.delivery_type === 'delivery' && partner.delivery_fee) {
        deliveryFee = Number(partner.delivery_fee);
      }

      const { items, ...orderWithoutItems } = order.order;
      const createdOrder = await ordersRepository.createOrder({
        ...orderWithoutItems,
        customer_id: customerId,
        status: 'pending',
        total_amount: itemsResult.totalAmount + deliveryFee,
        tip_amount: order.order.tip_amount ?? 0
      });

      await Promise.all([
        itemService.createOrderItems(createdOrder.id, itemsResult.itemsWithPrices),
        paymentService.createPayment({
          order_id: createdOrder.id,
          payment_status: 'pending',
          payment_method: order.payment.method
        })
      ]);

      const fullOrderDetails = await ordersRepository.findLatestOrderByPartnerId(createdOrder.partner_id);
      console.log(`Order created with ID: ${createdOrder.id}`, fullOrderDetails);
      const detailedOrder = mapOrderRowsFromPartnerQuery(fullOrderDetails);

      broadcastPartnerMessage(partner.id, {
        type: 'order_created',
        data: {
          order: detailedOrder
        }
      });

      return {
        message: "Order created successfully",
        order_id: createdOrder.id,
        status_url: `orders/${createdOrder.id}/status`,
      };
    },

    async findOrders(options?: GetOrdersQuery) {
      const [orders, totalCount] = await Promise.all([
        ordersRepository.findOrders(options),
        ordersRepository.countOrders(options)
      ]);

      return {
        orders: orders?.map(mapOrderRowToDetails) || [],
        pagination: {
          total: totalCount,
          ...(options?.limit !== undefined && { limit: options.limit }),
          ...(options?.offset !== undefined && { offset: options.offset })
        }
      };
    },

    async findOrderById(orderId: number) {
      try {
        const orderDetails = await ordersRepository.findOrderById(orderId);
        return orderDetails ? mapOrderRowToDetails(orderDetails) : null;
      } catch (error) {
        return null;
      }
    },

    findOrdersByPartnerId: async (partnerId: number) => {
      const orders = await ordersRepository.findOrdersByPartnerId(partnerId);
      if (!orders) {
        throw new ControllerError(404, 'OrderNotFound', 'Order not found');
      }
      return mapOrderRowsFromPartnerQuery(orders);
    },

    async updateOrder(orderId: number, orderData: OrderUpdateData) {
      let previousStatus = null;

      try {
        const currentOrder = await ordersRepository.findOrderById(orderId);
        previousStatus = currentOrder.status;
      } catch (err) {
        console.log(`Could not retrieve previous status for order ${orderId}`);
      }

      const [updatedOrder] = await Promise.all([
        ordersRepository.updateOrder(orderId, orderData).catch(() => {
          throw new ControllerError(404, 'OrderNotFound', 'Order not found');
        }),
        orderData.status ? broadcastOrderStatusUpdate(orderId, orderData.status) : Promise.resolve()
      ]);

      if (orderData.status && orderData.status !== previousStatus) {
        await this.notifyCustomerOfOrderUpdate(orderId, orderData.status);
        
        if (updatedOrder && ['confirmed', 'ready', 'preparing'].includes(orderData.status)) {
          broadcastPartnerMessage(updatedOrder.partner_id, {
            type: 'order_status_updated',
            data: {
              order: updatedOrder,
            }
          });
        }

        if (deliveryService && 
            orderData.status === 'confirmed' && 
            updatedOrder.delivery_type === 'delivery') {
          
          console.log(`Order #${orderId} changed to ${orderData.status} status - triggering IMMEDIATE delivery assignment`);
          try {
          } catch (error) {
            console.error(`Error automatically assigning delivery for order #${orderId}:`, error);
          }
        }
      }

      // Get complete order details
      const fullOrderDetails = await ordersRepository.findOrderById(orderId);
      return mapOrderRowToDetails(fullOrderDetails);
    },
    async notifyCustomerOfDeliveryAssignment(orderId: number, deliveryId: number): Promise<void> {
      try {
        const order = await ordersRepository.findOrderById(orderId);
        if (!order.customer_id) {
          return; // No customer to notify
        }

        const customer = await customerService.findCustomerById(order.customer_id);
        if (!customer?.user_id) {
          return; // No user ID to send notification to
        }

        await pushNotificationService.sendNotification(
          customer.user_id,
          'DELIVERY_ASSIGNED',
          {
            orderId,
            deliveryId
          }
        );
      } catch (error) {
        console.error(`Failed to send delivery assignment notification: ${error.message}`);
        // Non-critical error, don't throw
      }
    },
    async notifyCustomerOfOrderUpdate(orderId: number, status: string): Promise<void> {
      try {
        const order = await ordersRepository.findOrderById(orderId);
        if (!order.customer_id) {
          return; // No customer to notify
        }

        const customer = await customerService.findCustomerById(order.customer_id);
        if (!customer?.user_id) {
          return; // No user ID to send notification to
        }

        await pushNotificationService.sendOrderUpdateNotification(
          customer.user_id,
          status,
          orderId
        );
        console.log(`Order update notification sent for order #${orderId} to user ${customer.user_id}`);
      } catch (error) {
        console.error(`Failed to send order update notification: ${error.message}`);
      }
    },
    async getOrderCustomerEmail(orderId: number): Promise<string | null> {
        try {
            return await ordersRepository.getOrderCustomerEmail(orderId);
        } catch (error) {
            console.error(`Failed to get customer email for order #${orderId}:`, error);
            return null;
        }
    },
    async getOrderAndCustomerDetails(orderId: number): Promise<any | null> {
        return await ordersRepository.getOrderWithCustomerDetails(orderId);
    },
    async getOrderStatistics(partnerId?: number, options?: { startDate?: Date, endDate?: Date }): Promise<any> {
        return await ordersRepository.getOrderStatistics(partnerId, options);
    }
  };
}
