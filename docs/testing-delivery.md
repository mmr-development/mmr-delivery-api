# Testing the Delivery System

## Prerequisites
- An existing order in the system
- A courier user account with proper authentication
- API testing tool (like Postman, cURL, or your browser's fetch API)

## Testing Flow

### 1. Set up courier availability

Before receiving deliveries, make sure your courier is available:

```bash
curl -X POST http://localhost:3000/v1/courier/availability \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"is_available": true, "is_working": true}'
```

### 2. Assign a delivery to couriers

As an admin or partner, assign a delivery for an existing order:

```bash
curl -X POST http://localhost:3000/v1/orders/YOUR_ORDER_ID/delivery \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

This will:
- Create a delivery record
- Broadcast to all available couriers via WebSocket

### 3. Accept a delivery (as courier)

```bash
curl -X POST http://localhost:3000/v1/deliveries/DELIVERY_ID/accept \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer COURIER_JWT_TOKEN"
```

### 4. Update delivery status

Update the status as the courier progresses:

```bash
curl -X PATCH http://localhost:3000/v1/deliveries/DELIVERY_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer COURIER_JWT_TOKEN" \
  -d '{"status": "picked_up"}'
```

Status progression:
1. assigned (default)
2. accepted (when courier accepts)
3. picked_up (when courier picks up from restaurant)
4. in_transit (when courier is heading to customer)
5. delivered (completed delivery)
6. failed (problem with delivery)
7. canceled (delivery canceled)

## Testing with WebSockets

### 1. Set up a WebSocket connection

Using JavaScript in browser console or a WebSocket client:

```javascript
// Replace YOUR_COURIER_ID with actual courier ID
const ws = new WebSocket('ws://localhost:3000/ws/delivery/YOUR_COURIER_ID');

ws.onopen = function() {
  console.log('Connected to delivery websocket');
};

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

// Update location periodically (simulate GPS)
setInterval(() => {
  ws.send(JSON.stringify({
    event: 'update_location',
    data: {
      latitude: 59.3293 + (Math.random() * 0.01 - 0.005),
      longitude: 18.0686 + (Math.random() * 0.01 - 0.005)
    }
  }));
}, 10000);

// Accept a delivery via WebSocket
function acceptDelivery(deliveryId) {
  ws.send(JSON.stringify({
    event: 'accept_delivery',
    data: { deliveryId }
  }));
}

// Update delivery status via WebSocket
function updateStatus(deliveryId, status) {
  ws.send(JSON.stringify({
    event: 'update_delivery_status',
    data: { deliveryId, status }
  }));
}
```

### 2. Test delivery flow

1. When a new delivery is assigned, you'll receive a message over WebSocket with `event: 'new_delivery'`
2. Accept it using the `acceptDelivery(deliveryId)` function
3. You'll receive location data with pickup and dropoff coordinates
4. Update status as you progress with `updateStatus(deliveryId, 'picked_up')`, etc.

## Troubleshooting

- Check if your courier is properly authenticated
- Ensure the courier is marked as available and working
- Verify that WebSocket connections are established
- Check server logs for any errors during delivery processing
```

## Testing with Database Queries

You can also check the status directly in the database:

```sql
-- Check deliveries
SELECT * FROM delivery ORDER BY id DESC LIMIT 10;

-- Check courier availability
SELECT * FROM courier_availability WHERE courier_id = 'YOUR_COURIER_ID';

-- Check courier locations
SELECT * FROM courier_location WHERE courier_id = 'YOUR_COURIER_ID' ORDER BY timestamp DESC LIMIT 5;
```
