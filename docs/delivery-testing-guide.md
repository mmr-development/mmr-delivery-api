# Delivery System Testing Guide

This guide provides step-by-step instructions for testing the delivery system, including both REST API endpoints and WebSocket connections.

## Prerequisites

1. Your API server is running at `http://localhost:3000` (adjust if different)
2. You have a valid courier JWT token
3. You have Postman, curl, or another API testing tool

## Getting a Valid JWT Token

1. Log in using the authentication endpoint:

```bash
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "courier@example.com", "password": "yourpassword"}'
```

2. Save the JWT token from the response:
```json
{
  "token": "eyJhbGciOiJSUzI1NiIsInR5c..."
}
```

## Testing REST API Endpoints

### 1. Clock In as a Courier

```bash
curl -X POST http://localhost:3000/v1/courier/clock-in \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Check Your Courier Status

```bash
curl http://localhost:3000/v1/courier/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. View Your Assigned Deliveries

```bash
curl http://localhost:3000/v1/courier/deliveries \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Update a Delivery Status

```bash
curl -X PATCH http://localhost:3000/v1/deliveries/1/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "picked_up"}'
```

Valid status values: `assigned`, `picked_up`, `in_transit`, `delivered`, `failed`, `canceled`

### 5. Clock Out as a Courier

```bash
curl -X POST http://localhost:3000/v1/courier/clock-out \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Testing with the Delivery Test Page

1. Open the delivery test page in your browser:
```
http://localhost:3000/public/delivery-test.html
```

2. Paste your JWT token and connect.

3. Click "Clock In" to register as an active courier.

4. Click "Connect to WebSocket" to establish a real-time connection.

5. The WebSocket will automatically receive delivery assignments when you're assigned an order.

## Testing the End-to-End Flow

### Step 1: Create an Order

Create a delivery order:

```bash
curl -X POST http://localhost:3000/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "first_name": "Test",
      "last_name": "Customer",
      "email": "customer@example.com",
      "phone_number": "123456789",
      "address": {
        "country": "United States",
        "city": "New York",
        "street": "Broadway",
        "postal_code": "10001",
        "address_detail": "Apt 123"
      }
    },
    "order": {
      "partner_id": 1,
      "delivery_type": "delivery",
      "requested_delivery_time": "2023-06-15T12:00:00Z",
      "tip_amount": 5,
      "items": [
        {
          "catalog_item_id": 1,
          "quantity": 2
        }
      ]
    },
    "payment": {
      "method": "credit_card"
    }
  }'
```

### Step 2: Confirm the Order

```bash
curl -X POST http://localhost:3000/v1/orders/1/confirm \
  -H "Authorization: Bearer PARTNER_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

If you have a courier clocked in and connected to WebSocket, they should receive an instant assignment!

### Step 3: Check WebSocket Messages

Watch the message log in the delivery test page. You should see a delivery assignment message.

### Step 4: Update Delivery Status

Use the UI in the delivery test page to update the status through the WebSocket connection, or use the REST endpoint.

## Troubleshooting

### No courier assignments?

1. Make sure a courier is logged in and clocked in (check `/v1/courier/status`)
2. Ensure the courier is connected to the WebSocket
3. Confirm the order has `delivery_type: "delivery"` and status is `confirmed` or `ready`
4. Check server logs for error messages

### WebSocket connection issues?

1. Verify your token is valid
2. Make sure the WebSocket URL uses the correct protocol (`ws://` or `wss://`)
3. Check browser console for WebSocket errors
