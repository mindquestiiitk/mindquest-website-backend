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

## API Endpoints Overview

### Public Endpoints

- Authentication (register, login, password reset)
- Events (view, search)
- Teams (view team members)
- Health checks

### User Endpoints (Authenticated)

- Profile management
- Event registration
- Chat/messaging
- Merchandise orders

### Admin Endpoints (Admin Role Required)

- System statistics and monitoring
- User/counselor/message counts
- Event role management (assign, view, manage)
- Event creation and management with roles
- Security analytics

### SuperAdmin Endpoints (SuperAdmin Role Required)

- SuperAdmin management (add, remove, list)
- User management (view all, search, filter)
- Admin management (promote, demote, view)
- User permission management
- User deletion

---

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
    "code": "INVALID_REQUEST_DATA",
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
    "message": "Invalid email or password",
    "code": "INVALID_CREDENTIALS"
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
    "message": "Authentication token has expired",
    "code": "TOKEN_EXPIRED"
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

## Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "category": "error_category",
    "details": {
      // Additional error details
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Security Block Response

When a request is blocked by security features:

```json
{
  "success": false,
  "error": {
    "message": "Automated request detected and blocked",
    "code": "BOT_DETECTED",
    "category": "security",
    "reason": "Suspicious user agent pattern detected",
    "retryAfter": 60
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Rate Limit Response

When rate limit is exceeded:

```json
{
  "success": false,
  "error": {
    "message": "Rate limit exceeded for your user role",
    "code": "ADAPTIVE_RATE_LIMIT_EXCEEDED",
    "category": "rate_limit",
    "retryAfter": 60,
    "limit": 100,
    "remaining": 0,
    "resetTime": "2024-01-01T00:01:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Best Practices

### Error Handling

1. Always check the `success` field in responses
2. Handle all possible error codes
3. Implement retry logic for transient errors
4. Log errors for debugging
5. Handle security blocks gracefully

### Rate Limiting

1. Implement exponential backoff
2. Cache responses when possible
3. Batch requests when appropriate
4. Monitor rate limit headers

### Security

1. Always use HTTPS in production
2. Validate all input data on client side
3. Sanitize output data to prevent XSS
4. Keep tokens secure and rotate regularly
5. Implement proper CORS policies
6. Respect rate limits and geographic restrictions
7. Handle security blocks gracefully
8. Use college email domains for registration
9. Monitor for suspicious activity patterns
10. Implement proper session management

## Examples

### Register User with Email/Password

```javascript
const response = await fetch("http://localhost:3000/auth/register", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "John Doe",
    email: "john@iiitkottayam.ac.in",
    password: "SecurePassword123!",
    deviceInfo: {
      timezone: "Asia/Kolkata",
      screenResolution: "1920x1080",
    },
  }),
});

const data = await response.json();
if (data.success) {
  // Handle successful registration
  const { user, token } = data.data;
  localStorage.setItem("token", token);
} else {
  // Handle error
  console.error(data.error.message);
}
```

### Register User with Firebase OAuth

```javascript
const response = await fetch("http://localhost:3000/auth/register", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "John Doe",
    email: "john@iiitkottayam.ac.in",
    idToken: "firebase-id-token",
    provider: "google",
  }),
});
```

### Get Events

```javascript
const response = await fetch("http://localhost:3000/events", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const data = await response.json();
if (data.success) {
  const events = data.data;
  // Handle events
}
```

### Send Chat Message

```javascript
const response = await fetch("http://localhost:3000/chat/message", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    receiverId: "user123",
    content: "Hello, how are you?",
  }),
});

const data = await response.json();
if (data.success) {
  // Message sent successfully
}
```

## Admin Endpoints

All admin endpoints require authentication and admin privileges.

### Get System Statistics

```http
GET /admin/stats
Authorization: Bearer <admin_token>
```

Response (200 OK):

```json
{
  "success": true,
  "data": {
    "totalUsers": 1250,
    "totalCounselors": 15,
    "totalMessages": 8420,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Get User Count

```http
GET /admin/users/count
Authorization: Bearer <admin_token>
```

Response (200 OK):

```json
{
  "success": true,
  "data": {
    "count": 1250
  }
}
```

### Get Counselor Count

```http
GET /admin/counselors/count
Authorization: Bearer <admin_token>
```

Response (200 OK):

```json
{
  "success": true,
  "data": {
    "count": 15
  }
}
```

### Get Message Count

```http
GET /admin/messages/count
Authorization: Bearer <admin_token>
```

Response (200 OK):

```json
{
  "success": true,
  "data": {
    "count": 8420
  }
}
```

### Event Role Management

#### Assign Role to User for Event

```http
POST /admin/events/roles
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "userId": "string",
  "eventId": "string",
  "role": "organizer" | "volunteer" | "participant",
  "permissions": ["string"],
  "expiresAt": "2024-12-31T23:59:59.000Z"
}
```

Response (201 Created):

```json
{
  "success": true,
  "data": {
    "id": "string",
    "userId": "string",
    "eventId": "string",
    "role": "organizer",
    "permissions": ["manage_event", "view_participants"],
    "assignedBy": "string",
    "assignedAt": "2024-01-01T00:00:00.000Z",
    "expiresAt": "2024-12-31T23:59:59.000Z"
  }
}
```

#### Get User Roles for Events

```http
GET /admin/events/roles/user/:userId
Authorization: Bearer <admin_token>
```

Response (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "eventId": "string",
      "eventTitle": "string",
      "role": "organizer",
      "permissions": ["manage_event"],
      "assignedAt": "2024-01-01T00:00:00.000Z",
      "expiresAt": "2024-12-31T23:59:59.000Z"
    }
  ]
}
```

#### Get Event Roles

```http
GET /admin/events/roles/event/:eventId
Authorization: Bearer <admin_token>
```

Response (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "userId": "string",
      "userName": "string",
      "userEmail": "string",
      "role": "organizer",
      "permissions": ["manage_event"],
      "assignedAt": "2024-01-01T00:00:00.000Z",
      "expiresAt": "2024-12-31T23:59:59.000Z"
    }
  ]
}
```

#### Process Expired Roles

```http
POST /admin/events/roles/process-expired
Authorization: Bearer <admin_token>
```

Response (200 OK):

```json
{
  "success": true,
  "data": {
    "count": 5
  },
  "message": "Processed 5 expired roles"
}
```

#### Get Legacy Roles

```http
GET /admin/events/roles/legacy
Authorization: Bearer <admin_token>
```

Response (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "userId": "string",
      "eventId": "string",
      "role": "organizer",
      "isLegacy": true,
      "migratedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Event Management

#### Create Event with Roles

```http
POST /admin/events
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "event": {
    "title": "string",
    "description": "string",
    "date": "2024-01-01T00:00:00.000Z",
    "location": "string",
    "capacity": 100,
    "image": "string"
  },
  "roles": [
    {
      "userId": "string",
      "role": "organizer",
      "permissions": ["manage_event"]
    }
  ]
}
```

Response (201 Created):

```json
{
  "success": true,
  "data": {
    "event": {
      "id": "string",
      "title": "string",
      "description": "string",
      "date": "2024-01-01T00:00:00.000Z",
      "location": "string",
      "capacity": 100,
      "registered": 0,
      "status": "upcoming"
    },
    "roles": [
      {
        "id": "string",
        "userId": "string",
        "role": "organizer",
        "permissions": ["manage_event"]
      }
    ]
  }
}
```

#### Update Event with Roles

```http
PUT /admin/events/:eventId
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "event": {
    "title": "string",
    "description": "string",
    "capacity": 150
  },
  "roles": [
    {
      "userId": "string",
      "role": "volunteer",
      "permissions": ["view_participants"]
    }
  ]
}
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
      "capacity": 150
    },
    "roles": [
      {
        "id": "string",
        "userId": "string",
        "role": "volunteer",
        "permissions": ["view_participants"]
      }
    ]
  }
}
```

#### Search Events

```http
GET /admin/events/search?query=tech&role=organizer&userId=user123
Authorization: Bearer <admin_token>
```

Query Parameters:

- `query` (optional): Search term for event title/description
- `role` (optional): Filter by user role in events
- `userId` (optional): Filter by specific user

Response (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "title": "Tech Workshop",
      "description": "string",
      "date": "2024-01-01T00:00:00.000Z",
      "userRole": "organizer",
      "permissions": ["manage_event"]
    }
  ]
}
```

## SuperAdmin Endpoints

All superadmin endpoints require authentication and superadmin privileges.

### SuperAdmin Management

#### Add SuperAdmin

```http
POST /superadmin/add
Authorization: Bearer <superadmin_token>
Content-Type: application/json

{
  "userId": "string"
}
```

Response (200 OK):

```json
{
  "success": true,
  "data": {
    "userId": "string",
    "addedBy": "string",
    "addedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "User added as superadmin successfully"
}
```

#### Remove SuperAdmin

```http
POST /superadmin/remove
Authorization: Bearer <superadmin_token>
Content-Type: application/json

{
  "userId": "string"
}
```

Response (200 OK):

```json
{
  "success": true,
  "data": {
    "userId": "string",
    "removedBy": "string",
    "removedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "User removed from superadmin role successfully"
}
```

#### List SuperAdmins

```http
GET /superadmin/list
Authorization: Bearer <superadmin_token>
```

Response (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "email": "string",
      "name": "string",
      "addedBy": "string",
      "addedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Check SuperAdmin Status

```http
GET /superadmin/check/:userId
Authorization: Bearer <superadmin_token>
```

Response (200 OK):

```json
{
  "success": true,
  "data": {
    "userId": "string",
    "isSuperAdmin": true,
    "addedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### User Management

#### Get All Users

```http
GET /superadmin/users?page=1&limit=20&search=john&role=user
Authorization: Bearer <superadmin_token>
```

Query Parameters:

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `search` (optional): Search by name or email
- `role` (optional): Filter by user role

Response (200 OK):

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "string",
        "email": "string",
        "name": "string",
        "role": "user",
        "emailVerified": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "lastLoginAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1250,
      "pages": 63
    }
  }
}
```

#### Get All Admins

```http
GET /superadmin/admins
Authorization: Bearer <superadmin_token>
```

Response (200 OK):

```json
{
  "success": true,
  "data": {
    "admins": [
      {
        "id": "string",
        "email": "string",
        "name": "string",
        "type": "admin",
        "permissions": ["manage_users", "manage_content"],
        "promotedAt": "2024-01-01T00:00:00.000Z",
        "promotedBy": "string"
      }
    ],
    "superadmins": [
      {
        "id": "string",
        "email": "string",
        "name": "string",
        "type": "superadmin",
        "addedAt": "2024-01-01T00:00:00.000Z",
        "addedBy": "string"
      }
    ],
    "total": 5
  }
}
```

#### Promote User to Admin

```http
POST /superadmin/promote-admin
Authorization: Bearer <superadmin_token>
Content-Type: application/json

{
  "userId": "string",
  "permissions": ["manage_users", "manage_content", "view_analytics"]
}
```

Response (200 OK):

```json
{
  "success": true,
  "data": {
    "userId": "string",
    "role": "admin",
    "permissions": ["manage_users", "manage_content", "view_analytics"],
    "promotedBy": "string",
    "promotedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "User promoted to admin successfully"
}
```

#### Demote Admin to User

```http
POST /superadmin/demote-admin
Authorization: Bearer <superadmin_token>
Content-Type: application/json

{
  "userId": "string"
}
```

Response (200 OK):

```json
{
  "success": true,
  "data": {
    "userId": "string",
    "role": "user",
    "demotedBy": "string",
    "demotedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Admin demoted to user successfully"
}
```

#### Update User Permissions

```http
PUT /superadmin/user-permissions
Authorization: Bearer <superadmin_token>
Content-Type: application/json

{
  "userId": "string",
  "permissions": ["manage_users", "view_analytics"]
}
```

Response (200 OK):

```json
{
  "success": true,
  "data": {
    "userId": "string",
    "permissions": ["manage_users", "view_analytics"],
    "updatedBy": "string",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "User permissions updated successfully"
}
```

#### Delete User

```http
DELETE /superadmin/user/:userId
Authorization: Bearer <superadmin_token>
```

Response (200 OK):

```json
{
  "success": true,
  "data": {
    "userId": "string",
    "deletedBy": "string",
    "deletedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "User deleted successfully"
}
```

### Get Admin System Stats

```javascript
const response = await fetch("http://localhost:3000/admin/stats", {
  headers: {
    Authorization: `Bearer ${adminToken}`,
  },
});

const data = await response.json();
if (data.success) {
  const { totalUsers, totalCounselors, totalMessages } = data.data;
  // Handle system statistics
}
```

### Promote User to Admin (SuperAdmin)

```javascript
const response = await fetch("http://localhost:3000/superadmin/promote-admin", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${superadminToken}`,
  },
  body: JSON.stringify({
    userId: "user123",
    permissions: ["manage_users", "manage_content", "view_analytics"],
  }),
});

const data = await response.json();
if (data.success) {
  console.log("User promoted to admin successfully");
} else {
  console.error("Failed to promote user:", data.error.message);
}
```

### Assign Event Role (Admin)

```javascript
const response = await fetch("http://localhost:3000/admin/events/roles", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${adminToken}`,
  },
  body: JSON.stringify({
    userId: "user123",
    eventId: "event456",
    role: "organizer",
    permissions: ["manage_event", "view_participants"],
    expiresAt: "2024-12-31T23:59:59.000Z",
  }),
});

const data = await response.json();
if (data.success) {
  console.log("Role assigned successfully");
}
```

### Get Security Analytics (Admin)

```javascript
const response = await fetch(
  "http://localhost:3000/admin/security/analytics?days=7",
  {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  }
);

const data = await response.json();
if (data.success) {
  const { summary, dailyStats, topThreats } = data.data;
  // Handle security analytics
}
```

### Handle Rate Limiting

```javascript
async function makeRequest(url, options) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!data.success && data.error.code === "ADAPTIVE_RATE_LIMIT_EXCEEDED") {
      // Handle rate limiting
      const retryAfter = data.error.retryAfter || 60;
      console.log(`Rate limited. Retry after ${retryAfter} seconds`);

      // Implement exponential backoff
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return makeRequest(url, options); // Retry
    }

    return data;
  } catch (error) {
    console.error("Request failed:", error);
    throw error;
  }
}
```

## Error Codes

### Authentication Errors

- `INVALID_CREDENTIALS`: Invalid email or password
- `TOKEN_EXPIRED`: Authentication token has expired
- `UNAUTHORIZED_ACCESS`: Insufficient permissions for this action
- `ACCOUNT_DISABLED`: User account has been disabled
- `EMAIL_NOT_VERIFIED`: Email address needs to be verified
- `INVALID_TOKEN`: Authentication token is invalid or malformed
- `SESSION_EXPIRED`: User session has expired
- `REFRESH_TOKEN_INVALID`: Refresh token is invalid or expired

### Validation Errors

- `INVALID_REQUEST_DATA`: Request data format is invalid
- `MISSING_REQUIRED_FIELD`: Required field is missing from request
- `INVALID_EMAIL_FORMAT`: Email address format is invalid
- `INVALID_PASSWORD_FORMAT`: Password doesn't meet requirements
- `INVALID_PHONE_FORMAT`: Phone number format is invalid
- `FIELD_TOO_LONG`: Field exceeds maximum length
- `FIELD_TOO_SHORT`: Field is below minimum length
- `INVALID_DATE_FORMAT`: Date format is invalid

### Database Errors

- `DATABASE_CONNECTION_ERROR`: Unable to connect to database
- `RECORD_NOT_FOUND`: Requested record does not exist
- `DUPLICATE_RECORD`: Record already exists
- `CONSTRAINT_VIOLATION`: Database constraint violation
- `TRANSACTION_FAILED`: Database transaction failed
- `QUERY_TIMEOUT`: Database query timed out

### Security Errors

- `BOT_DETECTED`: Automated request detected and blocked
- `GEO_BLOCKED`: Access from your location is not permitted
- `CONTENT_FILTERED`: Content contains inappropriate material
- `SPAM_DETECTED`: Spam content detected and blocked
- `ABUSE_DETECTED`: Abusive content detected and blocked
- `WAF_BLOCKED`: Request blocked by Web Application Firewall
- `EMAIL_DOMAIN_NOT_ALLOWED`: Email domain is not authorized
- `SUSPICIOUS_ACTIVITY`: Suspicious activity pattern detected
- `IP_BLOCKED`: IP address has been blocked due to violations

### Rate Limiting

- `RATE_LIMIT_EXCEEDED`: Too many requests, please slow down
- `ADAPTIVE_RATE_LIMIT_EXCEEDED`: Rate limit exceeded for your user role
- `HOURLY_LIMIT_EXCEEDED`: Hourly request limit exceeded
- `DAILY_LIMIT_EXCEEDED`: Daily request limit exceeded
- `ENDPOINT_RATE_LIMIT_EXCEEDED`: Specific endpoint rate limit exceeded

### User Management Errors

- `USER_NOT_FOUND`: User account does not exist
- `USER_ALREADY_EXISTS`: User account already exists
- `PROFILE_UPDATE_FAILED`: Failed to update user profile
- `PERMISSION_DENIED`: You don't have permission for this action
- `ROLE_ASSIGNMENT_FAILED`: Failed to assign user role
- `USER_DELETION_FAILED`: Failed to delete user account

### Admin/SuperAdmin Errors

- `ADMIN_REQUIRED`: Admin privileges required for this action
- `SUPERADMIN_REQUIRED`: SuperAdmin privileges required for this action
- `CANNOT_PROMOTE_ADMIN`: User is already an admin
- `CANNOT_DEMOTE_USER`: User is not an admin
- `CANNOT_REMOVE_SELF`: Cannot remove yourself from admin/superadmin role
- `INSUFFICIENT_PERMISSIONS`: Insufficient permissions for this operation
- `INVALID_PERMISSIONS`: Invalid permission specified
- `ADMIN_NOT_FOUND`: Admin account does not exist
- `SUPERADMIN_NOT_FOUND`: SuperAdmin account does not exist
- `ROLE_UPDATE_FAILED`: Failed to update user role
- `PERMISSION_UPDATE_FAILED`: Failed to update user permissions

### Chat Errors

- `MESSAGE_SEND_FAILED`: Failed to send message
- `RECIPIENT_NOT_FOUND`: Message recipient does not exist
- `CHAT_HISTORY_UNAVAILABLE`: Unable to retrieve chat history
- `MESSAGE_TOO_LONG`: Message exceeds maximum length
- `BLOCKED_USER`: Cannot send message to blocked user
- `MARK_READ_FAILED`: Failed to mark messages as read

### Event Errors

- `EVENT_NOT_FOUND`: Event does not exist
- `EVENT_FULL`: Event has reached maximum capacity
- `REGISTRATION_FAILED`: Failed to register for event
- `EVENT_EXPIRED`: Event registration has expired
- `ALREADY_REGISTERED`: Already registered for this event
- `EVENT_CREATION_FAILED`: Failed to create event

### Merchandise Errors

- `PRODUCT_NOT_FOUND`: Product does not exist
- `INSUFFICIENT_STOCK`: Product is out of stock
- `ORDER_FAILED`: Failed to process order
- `INVALID_CART`: Shopping cart contains invalid items
- `PAYMENT_REQUIRED`: Payment is required to complete order
- `ORDER_NOT_FOUND`: Order does not exist

### Team Errors

- `TEAM_MEMBER_NOT_FOUND`: Team member does not exist
- `TEAM_SEED_FAILED`: Failed to seed team data
- `INVALID_TEAM_TYPE`: Invalid team type specified
- `INVALID_BATCH`: Invalid batch specified

### Counselor Errors

- `COUNSELOR_NOT_FOUND`: Counselor does not exist
- `COUNSELOR_CREATION_FAILED`: Failed to create counselor profile
- `AVAILABILITY_UPDATE_FAILED`: Failed to update counselor availability
- `COUNSELOR_NOT_AVAILABLE`: Counselor is not currently available

### System Errors

- `INTERNAL_SERVER_ERROR`: An unexpected error occurred
- `SERVICE_UNAVAILABLE`: Service is temporarily unavailable
- `MAINTENANCE_MODE`: System is under maintenance
- `FEATURE_DISABLED`: This feature is currently disabled
- `CONFIGURATION_ERROR`: System configuration error

## Support

For API support:

1. Check the documentation
2. Review error messages
3. Contact support@mindquest.com
4. Create an issue in the repository
