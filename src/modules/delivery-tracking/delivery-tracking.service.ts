import { DeliveryTrackingRepository } from './delivery-tracking.repository';
import { InsertableDeliveryTrackingRow, DeliveryTrackingRow } from './delivery-tracking.table';

export interface DeliveryTrackingService {
  saveLocation(location: InsertableDeliveryTrackingRow): Promise<DeliveryTrackingRow>;
  getLatestLocation(order_id: number): Promise<DeliveryTrackingRow | undefined>;
}

export function createDeliveryTrackingService(repository: DeliveryTrackingRepository): DeliveryTrackingService {
  return {
    saveLocation: (location) => repository.saveLocation(location),
    getLatestLocation: (order_id) => repository.getLatestLocation(order_id),
  };
}
