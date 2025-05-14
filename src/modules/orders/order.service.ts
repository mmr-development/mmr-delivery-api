import { CreateOrderRequest, OrderResponse, UpdateOrderRequest } from './order.schema';
import { OrdersRepository } from './order.repository';
import { CreatedOrder, OrderData, OrderItemData } from './order';

export interface OrderService {
    createOrder(order: OrderData): Promise<CreatedOrder>;
    createOrderItems(orderId: number, items: OrderItemData[]): Promise<OrderItemData[]>;
}

export function createOrderService(ordersRepository: OrdersRepository): OrderService {
    return {
        createOrder: async function (order: OrderData): Promise<CreatedOrder> {
            const createdOrder = await ordersRepository.createOrder(order);
            return {
                id: createdOrder.id,
                partner_id: createdOrder.partner_id,
                customer_id: createdOrder.customer_id,
                status: createdOrder.order_status,
                delivery_type: createdOrder.delivery_type,
                requested_delivery_time: createdOrder.requested_delivery_time,
                tip_amount: typeof createdOrder.tip_amount === "string" ? Number(createdOrder.tip_amount) : createdOrder.tip_amount,
                customer_note: createdOrder.customer_note ? createdOrder.customer_note : undefined,
                total_amount: typeof createdOrder.total_amount === "string" ? Number(createdOrder.total_amount) : createdOrder.total_amount,
                created_at: createdOrder.created_at,
                updated_at: createdOrder.updated_at,
            };
        },
        createOrderItems: async function (orderId: number, items: OrderItemData[]): Promise<OrderItemData[]> {
            const createdOrderItems = await ordersRepository.createOrderItems(orderId, items);
            return createdOrderItems.map(item => ({
                id: item.id,
                order_id: item.order_id,
                catalog_item_id: item.catalog_item_id,
                quantity: item.quantity,
                note: item.note ? item.note : undefined,
                price: typeof item.price === "string" ? Number(item.price) : item.price,
                created_at: item.created_at,
                updated_at: item.updated_at,
            }));
        },
    };
}