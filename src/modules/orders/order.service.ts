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
import { mapOrderRowToDetails } from './order-mapper';
import { OrderItemService } from './order-item.service';
import { CustomerAdapter } from './customer.adapter';
import { DeliveryService } from '../delivery/delivery.service';

// Simplified interface
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
}

export function createOrderService(
  ordersRepository: OrdersRepository, 
  userService: UserService, 
  addressService: AddressService, 
  customerService: CustomerService, 
  paymentService: PaymentService, 
  catalogService: CatalogService, 
  partnerService: PartnerService,
  deliveryService?: DeliveryService  // Add optional delivery service
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
      
      // Create order record
      const { items, ...orderWithoutItems } = order.order;
      const createdOrder = await ordersRepository.createOrder({
        ...orderWithoutItems,
        customer_id: customerId,
        status: 'pending',
        total_amount: itemsResult.totalAmount,
        tip_amount: order.order.tip_amount ?? 0
      });
      
      // Create order items and payment record in parallel
      await Promise.all([
        itemService.createOrderItems(createdOrder.id, itemsResult.itemsWithPrices),
        paymentService.createPayment({
          order_id: createdOrder.id,
          payment_status: 'pending',
          payment_method: order.payment.method
        })
      ]);
      
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
    
    async updateOrder(orderId: number, orderData: OrderUpdateData) {
      // Save previous status to check for status changes
      let previousStatus = null;
      
      try {
        const currentOrder = await ordersRepository.findOrderById(orderId);
        previousStatus = currentOrder.status;
      } catch (err) {
        console.log(`Could not retrieve previous status for order ${orderId}`);
      }
      
      // Update order
      const [updatedOrder] = await Promise.all([
        ordersRepository.updateOrder(orderId, orderData).catch(() => {
          throw new ControllerError(404, 'OrderNotFound', 'Order not found');
        }),
        orderData.status ? broadcastOrderStatusUpdate(orderId, orderData.status) : Promise.resolve()
      ]);
      
      // Check if status changed to ready and if it's a delivery-type order
      if (orderData.status === 'ready' && 
          previousStatus !== 'ready' && 
          deliveryService && 
          updatedOrder.delivery_type === 'delivery') {
        console.log(`Order #${orderId} is now ready for delivery - triggering automatic assignment`);
        
        // Trigger automatic delivery assignment in background
        Promise.resolve().then(() => {
          deliveryService.assignDeliveryAutomatically(orderId).then(delivery => {
            if (delivery) {
              console.log(`Successfully auto-assigned delivery #${delivery.id} for order #${orderId} to courier ${delivery.courier_id}`);
            } else {
              console.log(`No couriers available for auto-assignment of order #${orderId}, will retry later`);
              // Queue for retry (you could implement a retry mechanism here)
            }
          }).catch(error => {
            console.error(`Error automatically assigning delivery for order #${orderId}:`, error);
          });
        });
      }
      
      // Get complete order details
      const fullOrderDetails = await ordersRepository.findOrderById(orderId);
      return mapOrderRowToDetails(fullOrderDetails);
    },
  };
}
