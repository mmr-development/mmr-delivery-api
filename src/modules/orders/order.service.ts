import { OrdersRepository } from './order.repository';
import { CreatedOrder, OrderData, OrderItemData } from './order';
import { OrderRow } from './order.table';
import { UserService } from '../users/user.service';
import { AddressService } from '../address';
import { CreateOrderRequest, CreateOrderResponse } from './order.schema';
import { CustomerService } from '../customer/customer.service';
import { PaymentService } from '../payment/payment.service';
import { CatalogService } from '../partner/catalog';
import { PartnerService } from '../partner/partner.service';
import { ControllerError } from '../../utils/errors';

export interface OrderService {
    createOrder(order: CreateOrderRequest): Promise<CreateOrderResponse>;
    createOrderItems(orderId: number, items: OrderItemData[]): Promise<OrderItemData[]>;
    findOrders(options?: { offset?: number; limit?: number; }): Promise<{ orders: OrderRow[]; count: number }>;
}

export class PartnerNotFoundError extends Error { }
export class CatalogItemNotFoundError extends Error { }

export function createOrderService(ordersRepository: OrdersRepository, userService: UserService, addressService: AddressService, customerService: CustomerService, paymentService: PaymentService, catalogService: CatalogService, partnerService: PartnerService): OrderService {
    return {
        createOrder: async function (order: CreateOrderRequest): Promise<CreateOrderResponse> {
            const addressId = await addressService.createAddress(order.customer.address);
            const user = await userService.createCustomerUser(order.customer);
            const customer = await customerService.createOrFindCustomer({
                user_id: user.id,
                address_id: addressId,
            });

            const { items, ...orderWithoutItems } = order.order;

            const partner = await partnerService.findPartnerById(order.order.partner_id);

            if (!partner) {
                throw new ControllerError(404, 'PartnerNotFound', 'Partner not found');
            }

            let total_amount = 0;
            const itemsWithPrices = [];

            for (const item of items) {
                const catalogItem = await catalogService.findCatalogItemById(item.catalog_item_id);
                if (!catalogItem) {
                    throw new ControllerError(404, 'CatalogItemNotFound', `Catalog item with ID ${item.catalog_item_id} not found`);
                }
            
                const price = await catalogService.findCatalogItemPrice(item.catalog_item_id);
                if (price === null) {
                    throw new ControllerError(404, 'PriceNotFound', `Price for catalog item with ID ${item.catalog_item_id} not found`);
                }
                
                total_amount += price * item.quantity;
                
                itemsWithPrices.push({
                    ...item,
                    price: price
                });
            }

            const orderData = {
                ...orderWithoutItems,
                customer_id: customer.id,
                order_status: 'pending',
                total_amount: total_amount,
            };

            const createdOrder = await ordersRepository.createOrder(orderData)

            const catalogItem = await catalogService.findCatalogItemById(order.order.items[0].catalog_item_id);
            if (!catalogItem) {
                throw new ControllerError(404, 'CatalogItemNotFound', 'Catalog item not found');
            }

            const orderItems = await this.createOrderItems(createdOrder.id, order.order.items);

            paymentService.createPayment({
                order_id: createdOrder.id,
                payment_status: 'pending',
                payment_method: order.payment.method
            })

            return {
                message: "Order created successfully",
            }
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
        findOrders: async function (options?: { offset?: number; limit?: number; }): Promise<{ orders: OrderRow[]; count: number }> {
            const result = await ordersRepository.findOrders(options);
            return {
                orders: result.orders.map(order => ({
                    id: order.id,
                    partner_id: order.partner_id,
                    customer_id: order.customer_id,
                    order_status: order.order_status,
                    delivery_type: order.delivery_type,
                    requested_delivery_time: order.requested_delivery_time,
                    tip_amount: order.tip_amount,
                    customer_note: order.customer_note ?? null,
                    total_amount: order.total_amount,
                    created_at: order.created_at,
                    updated_at: order.updated_at,
                })),
                count: result.count,
            };
        },
    };
}
