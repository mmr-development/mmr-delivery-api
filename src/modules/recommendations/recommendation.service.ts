import { CatalogService } from '../catalog/catalog.service';
import { OrdersRepository } from '../orders/order.repository';

export interface RecommendationService {
  getPopularItems(limit: number): Promise<any[]>;
  getPersonalizedRecommendations(userId: string, limit: number): Promise<any[]>;
}

export function createRecommendationService(
  ordersRepository: OrdersRepository,
  catalogService: CatalogService
): RecommendationService {
  return {
    getPopularItems: async function(limit: number = 3): Promise<any[]> {
      const topItems = await ordersRepository.getMostPurchasedItems(limit);
      // Enrich with catalog details
      const enrichedItems = [];
      for (const item of topItems) {
        const catalogItem = await catalogService.findCatalogItemById(item.catalog_item_id);
        if (catalogItem) {
          enrichedItems.push({
            ...catalogItem,
            purchase_count: item.purchase_count
          });
        }
      }
      return enrichedItems;
    },

    getPersonalizedRecommendations: async function(userId: string, limit: number = 3): Promise<any[]> {
      const userOrders = await ordersRepository.getUserFrequentlyOrderedItems(userId, limit);
      if (userOrders.length < limit) {
        const popularItems = await this.getPopularItems(limit - userOrders.length);
        return [...userOrders, ...popularItems];
      }
      return userOrders;
    }
  };
}