import { OrdersRepository } from './order.repository';
import { CreatedOrder, OrderData, OrderItemData } from './order';
import { OrderItemRow, OrderRow, OrderWithDetailsRow } from './order.table';
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
    prepareCustomerForOrder(customer: any): Promise<any>;
    processOrderItems(items: any, tipAmount?: number): Promise<any>
    findOrders(options?: { offset?: number; limit?: number; }): Promise<any[]>;
}

export class PartnerNotFoundError extends Error { }
export class CatalogItemNotFoundError extends Error { }

export function createOrderService(ordersRepository: OrdersRepository, userService: UserService, addressService: AddressService, customerService: CustomerService, paymentService: PaymentService, catalogService: CatalogService, partnerService: PartnerService): OrderService {
    return {
        createOrder: async function (order: CreateOrderRequest): Promise<CreateOrderResponse> {
            const customer = await this.prepareCustomerForOrder(order.customer);

            const { items, ...orderWithoutItems } = order.order;

            const partner = await partnerService.findPartnerById(order.order.partner_id);

            if (!partner) {
                throw new ControllerError(404, 'PartnerNotFound', 'Partner not found');
            }

            const { itemsWithPrices, total_amount } = await this.processOrderItems(order.order.items, order.order.tip_amount);

            const orderData = {
                ...orderWithoutItems,
                customer_id: customer.id,
                status: 'pending',
                total_amount: total_amount,
            };

            const createdOrder = await ordersRepository.createOrder(orderData)

            await this.createOrderItems(createdOrder.id, itemsWithPrices);

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
            const insertableOrderItems = items.map(item => ({
                order_id: orderId,
                catalog_item_id: item.catalog_item_id,
                quantity: item.quantity,
                price: item.price ?? 0,
                note: item.note ?? null,
            }));

            const createdOrderItems = await ordersRepository.createOrderItems(insertableOrderItems);

            return createdOrderItems.map(item => ({
                id: item.id,
                order_id: item.order_id,
                catalog_item_id: item.catalog_item_id,
                quantity: item.quantity,
                note: item.note ? item.note : undefined,
                price: item.price,
                created_at: item.created_at,
                updated_at: item.updated_at,
            }));
        },
        prepareCustomerForOrder: async function (customerData: any): Promise<any> {
            const addressId = await addressService.createAddress(customerData.address);
            const user = await userService.createCustomerUser(customerData);
            return await customerService.createOrFindCustomer({
                user_id: user.id,
                address_id: addressId,
            });
        },
        async processOrderItems(items, tipAmount = 0) {
            let total_amount = 0;
            const itemsWithPrices = [];
        
            for (const item of items) {
                const catalogItem = await catalogService.findCatalogItemById(item.catalog_item_id);
                if (!catalogItem) {
                    throw new ControllerError(404, 'CatalogItemNotFound',
                        `Catalog item with ID ${item.catalog_item_id} not found`);
                }
        
                const price = await catalogService.findCatalogItemPrice(item.catalog_item_id);
                if (price === null) {
                    throw new ControllerError(404, 'PriceNotFound',
                        `Price for catalog item with ID ${item.catalog_item_id} not found`);
                }
        
                total_amount += price * item.quantity;
                itemsWithPrices.push({ ...item, price });
            }
        
            // Add the tip amount
            total_amount += Number(tipAmount) || 0;
        
            return { itemsWithPrices, total_amount };
        },
        findOrders: async function (options?: { offset?: number; limit?: number; }): Promise<any> {
            const ordersRow = await ordersRepository.findOrders();
        
            if (ordersRow && Array.isArray(ordersRow)) {
                return { orders: ordersRow.map(rowToOrder) };
            }
            return { orders: [] };
        },
    };
}

export function rowToOrder(row: OrderWithDetailsRow): any {
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
                address_detail: row.address_detail,
            }
        },
        delivery_type: row.delivery_type,
        status: row.status,
        requested_delivery_time: row.requested_delivery_time,
        tip_amount: row.tip_amount,
        note: row.note,
        items: row.catalog_item_id !== null ? [{
            catalog_item_id: row.catalog_item_id,
            quantity: row.quantity,
            note: row.item_note,
            price: row.price,
            name: row.item_name
        }] : [],
        payment: {
            method: row.payment_method
        },
        created_at: row.created_at,
        updated_at: row.updated_at,
    }
}
