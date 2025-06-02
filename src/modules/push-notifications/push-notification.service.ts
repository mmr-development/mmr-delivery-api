import { Expo } from 'expo-server-sdk';
import { PushNotificationRepository } from './push-notification.repository';

export interface PushNotificationService {
    sendOrderUpdateNotification(userId: string, status: string, orderId: number): Promise<void>;
}

export function createPushNotificationService(repository: PushNotificationRepository): PushNotificationService {
    const expo = new Expo({});
    return {
        sendOrderUpdateNotification: async function (userId: string, status: string, orderId: number): Promise<void> {
            const pushTokens = await repository.getPushTokensForUser(userId);
            let messages = [];
            for (let pushToken of pushTokens) {
                if (!Expo.isExpoPushToken(pushToken)) continue;
                messages.push({
                    to: pushToken,
                    sound: 'default',
                    body: `Your order #${orderId} status has been updated to ${status}.`,
                    data: { orderId, status },
                })
            }

            if (messages.length > 0) {
                let chunks = expo.chunkPushNotifications(messages);
                let tickets = [];

                for (let chunk of chunks) {
                    try {
                        let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                        tickets.push(...ticketChunk);
                    } catch (error) {
                        throw new Error(`Failed to send push notifications: ${error.message}`);
                    }
                }
            } else {
                console.log('No valid push tokens to send notifications to.');
            }
        }
    }
}
