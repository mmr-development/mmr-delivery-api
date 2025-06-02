import { sign, verify } from 'jsonwebtoken';
import { config } from '../../config';

export interface DeliveryToken {
  delivery_id: number;
  order_id?: number;
  created_at: string;
}

export interface DeliveryTokenService {
  generateToken(deliveryId: number, orderId?: number): string;
  verifyToken(token: string): DeliveryToken | null;
}

export const createDeliveryTokenService = (): DeliveryTokenService => {
  const secret = config.deliveryTokenSecret
  return {
    generateToken(deliveryId: number, orderId?: number): string {
      const payload: DeliveryToken = {
        delivery_id: deliveryId,
        order_id: orderId,
        created_at: new Date().toISOString()
      };
      
      return sign(payload, secret, { expiresIn: '24h' });
    },
    
    verifyToken(token: string): DeliveryToken | null {
      try {
        return verify(token, secret) as DeliveryToken;
      } catch (error) {
        console.error('Error verifying delivery token:', error);
        return null;
      }
    }
  };
};