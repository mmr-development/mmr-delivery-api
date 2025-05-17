import { OrderItem } from './order.schema';
import { CatalogService } from '../partner/catalog';
import { OrdersRepository } from './order.repository';
import { ControllerError } from '../../utils/errors';

export class OrderItemService {
  constructor(
    private catalogService: CatalogService,
    private ordersRepository: OrdersRepository
  ) {}

  async processItems(items: OrderItem[], tipAmount = 0): Promise<{ 
    itemsWithPrices: OrderItem[], 
    totalAmount: number 
  }> {
    // Process all items in parallel
    const processedItems = await Promise.all(
      items.map(item => this.enrichItemWithPrice(item))
    );
    
    // Calculate total amount
    const itemsTotal = processedItems.reduce(
      (sum, item) => sum + (item.price * item.quantity), 
      0
    );
    
    return { 
      itemsWithPrices: processedItems, 
      totalAmount: itemsTotal + Number(tipAmount || 0)
    };
  }

  async createOrderItems(orderId: number, items: OrderItem[]): Promise<void> {
    const insertableItems = items.map(item => ({
      order_id: orderId,
      catalog_item_id: item.catalog_item_id,
      quantity: item.quantity,
      price: item.price ?? 0,
      note: item.note ?? null,
    }));

    await this.ordersRepository.createOrderItems(insertableItems);
  }

  private async enrichItemWithPrice(item: OrderItem): Promise<OrderItem> {
    const catalogItem = await this.catalogService.findCatalogItemById(item.catalog_item_id);
    if (!catalogItem) {
      throw new ControllerError(404, 'CatalogItemNotFound',
        `Catalog item with ID ${item.catalog_item_id} not found`);
    }

    const price = await this.catalogService.findCatalogItemPrice(item.catalog_item_id);
    if (price === null) {
      throw new ControllerError(404, 'PriceNotFound',
        `Price for catalog item with ID ${item.catalog_item_id} not found`);
    }
    
    return { ...item, price };
  }
}
