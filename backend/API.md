# MindQuest API Documentation

## Base URL

```
https://api.mindquest.com/v1
```

## Authentication

All API requests require authentication using a Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

## API Endpoints

### Authentication

#### Register User

```http
POST /auth/register
Content-Type: application/json

{
  "name": "string",
  "email": "string",
  "idToken": "string" // Firebase ID token
}
```

Response (200 OK):

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "name": "string",
      "email": "string",
      "role": "user"
    },
    "token": "string"
  }
}
```

Error Response (400 Bad Request):

```json
{
  "success": false,
  "error": {
    "message": "Invalid request data",
    "code": "VAL_001",
    "details": {
      "email": "Invalid email format",
      "password": "Password must be at least 8 characters"
    }
  }
}
```

#### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "string",
  "password": "string"
}
```

Response (200 OK):

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "name": "string",
      "email": "string",
      "role": "string"
    },
    "token": "string"
  }
}
```

Error Response (401 Unauthorized):

```json
{
  "success": false,
  "error": {
    "message": "Invalid credentials",
    "code": "AUTH_001"
  }
}
```

#### Get Current User

```http
GET /auth/me
Authorization: Bearer <token>
```

Response (200 OK):

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "name": "string",
      "email": "string",
      "role": "string"
    }
  }
}
```

Error Response (401 Unauthorized):

```json
{
  "success": false,
  "error": {
    "message": "Token expired",
    "code": "AUTH_002"
  }
}
```

### Events

#### Get All Events

```http
GET /events
Authorization: Bearer <token>
```

Query Parameters:

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `sort` (optional): Sort field (default: "date")
- `order` (optional): Sort order ("asc" or "desc")

Response (200 OK):

```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "string",
        "title": "string",
        "description": "string",
        "date": "string",
        "location": "string",
        "image": "string",
        "capacity": number,
        "registered": number,
        "status": "upcoming" | "ongoing" | "completed"
      }
    ],
    "pagination": {
      "page": number,
      "limit": number,
      "total": number,
      "pages": number
    }
  }
}
```

#### Get Event by ID

```http
GET /events/:eventId
Authorization: Bearer <token>
```

Response (200 OK):

```json
{
  "success": true,
  "data": {
    "event": {
      "id": "string",
      "title": "string",
      "description": "string",
      "date": "string",
      "location": "string",
      "image": "string",
      "capacity": number,
      "registered": number,
      "status": "upcoming" | "ongoing" | "completed",
      "organizer": {
        "id": "string",
        "name": "string",
        "email": "string"
      },
      "participants": [
        {
          "id": "string",
          "name": "string",
          "email": "string"
        }
      ]
    }
  }
}
```

### Chat

#### Send Message

```http
POST /chat/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipientId": "string",
  "content": "string"
}
```

Response (200 OK):

```json
{
  "success": true,
  "data": {
    "message": {
      "id": "string",
      "content": "string",
      "senderId": "string",
      "recipientId": "string",
      "timestamp": "string",
      "status": "sent" | "delivered" | "read"
    }
  }
}
```

#### Get Messages

```http
GET /chat/messages/:userId
Authorization: Bearer <token>
```

Query Parameters:

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `before` (optional): Get messages before this timestamp

Response (200 OK):

```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "string",
        "content": "string",
        "senderId": "string",
        "recipientId": "string",
        "timestamp": "string",
        "status": "sent" | "delivered" | "read"
      }
    ],
    "pagination": {
      "page": number,
      "limit": number,
      "total": number,
      "pages": number
    }
  }
}
```

## Error Codes

### Authentication Errors

- `AUTH_001`: Invalid credentials
- `AUTH_002`: Token expired
- `AUTH_003`: Unauthorized access
- `AUTH_004`: Account disabled
- `AUTH_005`: Email not verified

### Validation Errors

- `VAL_001`: Invalid request data
- `VAL_002`: Missing required field
- `VAL_003`: Invalid field format
- `VAL_004`: Field length exceeded

### Database Errors

- `DB_001`: Database connection error
- `DB_002`: Record not found
- `DB_003`: Duplicate record
- `DB_004`: Constraint violation

### Rate Limiting

- `RATE_001`: Too many requests
- `RATE_002`: Rate limit exceeded

## Rate Limits

### Authentication Endpoints

- `/auth/register`: 5 requests per hour per IP
- `/auth/login`: 10 requests per minute per IP
- `/auth/forgot-password`: 3 requests per hour per email

### General Endpoints

- All other endpoints: 100 requests per minute per user

## Webhooks

### Event Registration

```http
POST /webhooks/event-registration
Content-Type: application/json
X-Webhook-Signature: <signature>

{
  "eventId": "string",
  "userId": "string",
  "action": "register" | "unregister"
}
```

### Message Status

```http
POST /webhooks/message-status
Content-Type: application/json
X-Webhook-Signature: <signature>

{
  "messageId": "string",
  "status": "delivered" | "read"
}
```

## WebSocket Events

### Connection

```javascript
// Connect to WebSocket
const ws = new WebSocket("wss://api.mindquest.com/ws");

// Authenticate
ws.send(
  JSON.stringify({
    type: "auth",
    token: "your-token",
  })
);
```

### Message Events

```javascript
// Listen for new messages
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "message") {
    // Handle new message
  }
};
```

### Event Types

- `message`: New message received
- `message_status`: Message status update
- `typing`: User typing status
- `online`: User online status
- `error`: Error notification

## Best Practices

### Error Handling

1. Always check the `success` field in responses
2. Handle all possible error codes
3. Implement retry logic for transient errors
4. Log errors for debugging

### Rate Limiting

1. Implement exponential backoff
2. Cache responses when possible
3. Batch requests when appropriate
4. Monitor rate limit headers

### Security

1. Always use HTTPS
2. Validate all input data
3. Sanitize output data
4. Keep tokens secure
5. Implement proper CORS policies

## Examples

### Register User

```javascript
const response = await fetch("https://api.mindquest.com/v1/auth/register", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "John Doe",
    email: "john@example.com",
    idToken: "firebase-id-token",
  }),
});

const data = await response.json();
if (data.success) {
  // Handle successful registration
} else {
  // Handle error
}
```

### Get Events with Pagination

```javascript
const response = await fetch(
  "https://api.mindquest.com/v1/events?page=1&limit=10&sort=date&order=desc",
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const data = await response.json();
if (data.success) {
  const { events, pagination } = data.data;
  // Handle events and pagination
}
```

## Support

For API support:

1. Check the documentation
2. Review error messages
3. Contact support@mindquest.com
4. Create an issue in the repository
