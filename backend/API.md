# MindQuest API Documentation

## Base URL

**Development:**

```
http://localhost:3001
```

**Production:**

```
https://api.mindquest.com
```

## Authentication

All protected API requests require authentication using a Bearer token in the Authorization header:

```
Authorization: Bearer <firebase_id_token>
```

### Authentication Flow

1. **Register/Login** with Firebase on frontend
2. **Get Firebase ID Token** from Firebase Auth
3. **Send token** in Authorization header for API requests
4. **Backend validates** token with Firebase Admin SDK

## API Architecture - Normalized Data Structure

### Key Features

- **Normalized Database**: User data stored once in `users/{userId}` collection
- **Reference-Based Roles**: Event roles store only user references, not duplicate data
- **Real-time Population**: User details populated on-demand from authoritative source
- **Consistent Data**: Profile updates automatically reflect across all features

## API Endpoints Overview

### 🌐 Public Endpoints (No Authentication)

- **Authentication**: Register, login, password reset, token verification
- **Events**: View events and event details with populated user data
- **Health**: System health checks and status

### 🔐 User Endpoints (Authentication Required)

- **Profile Management**: Update profile, avatar, bio, social links
- **User Operations**: Search users, view profiles, preferences
- **Counselor Services**: Access human and AI counselor support

### 👑 Admin Endpoints (Admin Role Required)

- **Event Management**: Create/update events with role assignments
- **Role Management**: Assign/manage event roles with user population
- **System Analytics**: User statistics, security monitoring
- **User Administration**: Role updates, user management

### SuperAdmin Endpoints (SuperAdmin Role Required)

- SuperAdmin management (add, remove, list)
- User management (view all, search, filter)
- Admin management (promote, demote, view)
- User permission management
- User deletion

---

## 🔐 Authentication Endpoints

### Register User

Creates a new user account with Firebase authentication and normalized user data.

```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@university.edu",
  "idToken": "firebase_id_token_here",
  "provider": "password"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "firebase_user_id",
      "name": "John Doe",
      "email": "john@university.edu",
      "role": "user",
      "avatarId": "default",
      "bio": "",
      "socialLinks": {},
      "provider": "password",
      "emailVerified": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_session_token"
  },
  "message": "User registered successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Login User

Authenticates existing user with Firebase ID token.

```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@university.edu",
  "idToken": "firebase_id_token_here"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "firebase_user_id",
      "name": "John Doe",
      "email": "john@university.edu",
      "role": "user",
      "avatarId": "avatar_2",
      "bio": "Computer Science student passionate about AI",
      "socialLinks": {
        "linkedin": "https://linkedin.com/in/johndoe",
        "github": "https://github.com/johndoe",
        "website": "https://johndoe.dev"
      },
      "provider": "password",
      "emailVerified": true
    },
    "token": "jwt_session_token"
  },
  "message": "Login successful",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Get Current User

Retrieves current authenticated user with complete profile data.

```http
GET /auth/me
Authorization: Bearer <firebase_id_token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "firebase_user_id",
      "name": "John Doe",
      "email": "john@university.edu",
      "role": "user",
      "avatarId": "avatar_2",
      "bio": "Computer Science student passionate about AI",
      "socialLinks": {
        "linkedin": "https://linkedin.com/in/johndoe",
        "github": "https://github.com/johndoe"
      },
      "provider": "password",
      "emailVerified": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  },
  "message": "User retrieved successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Update User Profile

Updates user profile with normalized data architecture.

```http
PUT /auth/me
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "name": "John Smith",
  "avatarId": "avatar_3",
  "bio": "Full-stack developer and AI enthusiast",
  "socialLinks": {
    "linkedin": "https://linkedin.com/in/johnsmith",
    "github": "https://github.com/johnsmith",
    "website": "https://johnsmith.dev",
    "twitter": "https://twitter.com/johnsmith"
  }
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "firebase_user_id",
      "name": "John Smith",
      "email": "john@university.edu",
      "role": "user",
      "avatarId": "avatar_3",
      "bio": "Full-stack developer and AI enthusiast",
      "socialLinks": {
        "linkedin": "https://linkedin.com/in/johnsmith",
        "github": "https://github.com/johnsmith",
        "website": "https://johnsmith.dev",
        "twitter": "https://twitter.com/johnsmith"
      },
      "provider": "password",
      "emailVerified": true,
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  },
  "message": "Profile updated successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🎉 Events Endpoints

### Get All Events

Retrieves all events with basic information (public endpoint).

```http
GET /events
```

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `sort` (optional): Sort field (default: "date")
- `order` (optional): Sort order ("asc" or "desc")

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "p1",
      "title": "AI Workshop 2024",
      "description": "Learn the fundamentals of artificial intelligence",
      "date": "2024-02-15T10:00:00.000Z",
      "location": "Tech Hub, Room 101",
      "image": "https://example.com/ai-workshop.jpg",
      "capacity": 50,
      "registered": 23,
      "status": "upcoming",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "Events retrieved successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Get Event by ID

Retrieves detailed event information with populated user data from normalized architecture.

```http
GET /events/:eventId
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "p1",
    "title": "AI Workshop 2024",
    "description": "Learn the fundamentals of artificial intelligence and machine learning",
    "date": "2024-02-15T10:00:00.000Z",
    "location": "Tech Hub, Room 101",
    "image": "https://example.com/ai-workshop.jpg",
    "capacity": 50,
    "registered": 23,
    "status": "upcoming",
    "roles": [
      {
        "userId": "organizer_user_id",
        "role": "organizer",
        "permissions": ["manage_event", "assign_roles"],
        "assignedAt": "2024-01-01T00:00:00.000Z",
        "expiration": null,
        "userDetails": {
          "name": "Dr. Sarah Johnson",
          "email": "sarah.johnson@university.edu",
          "avatarId": "avatar_5",
          "bio": "AI Research Professor",
          "socialLinks": {
            "linkedin": "https://linkedin.com/in/sarahjohnson",
            "website": "https://sarahjohnson.ai"
          },
          "photoURL": null
        }
      },
      {
        "userId": "volunteer_user_id",
        "role": "volunteer",
        "permissions": ["view_participants"],
        "assignedAt": "2024-01-05T00:00:00.000Z",
        "expiration": "2024-02-20T00:00:00.000Z",
        "userDetails": {
          "name": "Mike Chen",
          "email": "mike.chen@university.edu",
          "avatarId": "avatar_1",
          "bio": "CS Student and AI enthusiast",
          "socialLinks": {
            "github": "https://github.com/mikechen",
            "linkedin": "https://linkedin.com/in/mikechen"
          },
          "photoURL": null
        }
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Event retrieved successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 👑 Admin Endpoints

### Assign Event Role

Assigns a role to a user for a specific event using normalized architecture.

```http
POST /admin/events/roles
Authorization: Bearer <admin_firebase_token>
Content-Type: application/json

{
  "userId": "user_firebase_id",
  "eventId": "p1",
  "role": "organizer",
  "permissions": ["manage_event", "assign_roles"],
  "expiration": "2024-12-31T23:59:59.000Z"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "userId": "user_firebase_id",
    "eventId": "p1",
    "role": "organizer",
    "permissions": ["manage_event", "assign_roles"],
    "assignedAt": "2024-01-01T00:00:00.000Z",
    "expiration": "2024-12-31T23:59:59.000Z",
    "userDetails": {
      "name": "John Doe",
      "email": "john@university.edu",
      "avatarId": "avatar_2",
      "bio": "Event management specialist",
      "socialLinks": {
        "linkedin": "https://linkedin.com/in/johndoe"
      }
    }
  },
  "message": "Role assigned successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Get Event Roles

Retrieves all roles for a specific event with populated user data.

```http
GET /admin/events/roles/event/:eventId
Authorization: Bearer <admin_firebase_token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "userId": "organizer_user_id",
      "role": "organizer",
      "permissions": ["manage_event", "assign_roles"],
      "assignedAt": "2024-01-01T00:00:00.000Z",
      "expiration": null,
      "userDetails": {
        "name": "Dr. Sarah Johnson",
        "email": "sarah.johnson@university.edu",
        "avatarId": "avatar_5",
        "bio": "AI Research Professor",
        "socialLinks": {
          "linkedin": "https://linkedin.com/in/sarahjohnson"
        }
      }
    }
  ],
  "message": "Event roles retrieved successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 👥 User Endpoints

### Get User Profile

Retrieves user profile with normalized data.

```http
GET /users/profile/:userId
Authorization: Bearer <firebase_id_token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "user_firebase_id",
    "name": "John Doe",
    "email": "john@university.edu",
    "role": "user",
    "avatarId": "avatar_2",
    "bio": "Computer Science student passionate about AI",
    "socialLinks": {
      "linkedin": "https://linkedin.com/in/johndoe",
      "github": "https://github.com/johndoe"
    },
    "provider": "password",
    "emailVerified": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "User profile retrieved successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Search Users

Search for users by name or email.

```http
GET /users/search?q=john&limit=10
Authorization: Bearer <firebase_id_token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "user_firebase_id",
      "name": "John Doe",
      "email": "john@university.edu",
      "avatarId": "avatar_2",
      "bio": "Computer Science student"
    }
  ],
  "message": "Users found successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🧠 Counselor Endpoints

### Get Human Counselors

Retrieve available human counselors for support.

```http
GET /counselors/human
Authorization: Bearer <firebase_id_token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "counselor_id",
      "name": "Dr. Sarah Johnson",
      "specialization": "Academic Stress Management",
      "availability": "available",
      "rating": 4.8,
      "experience": "5 years",
      "type": "human"
    }
  ],
  "message": "Human counselors retrieved successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Get AI Counselor

Access AI-powered counseling support.

```http
GET /counselors/ai
Authorization: Bearer <firebase_id_token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "ai_counselor",
    "name": "MindQuest AI Assistant",
    "type": "ai",
    "availability": "24/7",
    "capabilities": [
      "stress_management",
      "study_planning",
      "emotional_support",
      "goal_setting"
    ],
    "status": "online"
  },
  "message": "AI counselor information retrieved successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
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

## 🎛️ Admin Dashboard Testing

### Access the Admin Dashboard

Navigate to the admin dashboard in the client application for easy testing of event management functionality:

```
http://localhost:5174/admin-dashboard
```

**Note**: The admin dashboard is now integrated into the React client application for better user experience and authentication integration.

### Dashboard Features

#### 🔐 Authentication Setup

- Enter your Firebase admin ID token
- Test authentication status
- Verify admin permissions

#### 🎉 Event Management

- **Create New Event**: Add events with title, description, date, location, and capacity
- **Get All Events**: View all events in the system
- **Get Event p1**: View specific event with populated user roles

#### 👑 Role Management

- **Assign Event Role**: Assign roles (organizer, volunteer, mentor, lead) to users
- **Get Event Roles**: View all roles for an event with populated user details
- **Permission Management**: Automatic permission assignment based on role type

#### 🧪 Data Consistency Testing

- **Complete Test Suite**: Automated testing of all functionality
- **Real-time Validation**: Verify user data population in event roles
- **Architecture Testing**: Confirm normalized data structure is working

### Testing Event ID "p1"

The dashboard is pre-configured to test with event ID "p1":

1. **View Event Details**: Click "Get Event p1" to see event with populated roles
2. **Assign New Role**: Use the role management section to assign roles to users
3. **Verify Data Consistency**: Check that user profile updates reflect in event roles
4. **Run Full Test**: Execute the complete test suite for comprehensive validation

### Key Testing Points

1. **Data Normalization**: User data stored once in `users/{userId}`
2. **Real-time Population**: Event roles show fresh user data on every request
3. **Avatar Persistence**: Avatar changes persist through logout/login cycles
4. **Social Links**: Profile updates immediately reflect in event displays
5. **Performance**: Efficient user data population without duplication

### Dashboard Benefits

- **Visual Interface**: Easy-to-use web interface instead of command line
- **Real-time Results**: Immediate feedback on API operations
- **Automated Testing**: Built-in test suite for comprehensive validation
- **Error Handling**: Clear error messages and troubleshooting
- **Data Visualization**: Formatted display of API responses

## 📝 Examples

### Complete Registration Flow

```javascript
const response = await fetch("http://localhost:3001/auth/register", {
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

### Update Profile with Social Links

```javascript
const response = await fetch("http://localhost:3001/auth/me", {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${firebaseIdToken}`,
  },
  body: JSON.stringify({
    name: "John Smith",
    avatarId: "avatar_3",
    bio: "Full-stack developer and AI enthusiast",
    socialLinks: {
      linkedin: "https://linkedin.com/in/johnsmith",
      github: "https://github.com/johnsmith",
      website: "https://johnsmith.dev",
    },
  }),
});

const data = await response.json();
if (data.success) {
  // Profile updated successfully
  console.log("Avatar and social links updated");
}
```

### Access Human Counselor

```javascript
const response = await fetch("http://localhost:3001/counselors/human", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${firebaseIdToken}`,
  },
});

const data = await response.json();
if (data.success) {
  const counselors = data.data;
  // Display available human counselors
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

### Counselor Errors

- `COUNSELOR_NOT_FOUND`: Counselor does not exist
- `COUNSELOR_TYPE_INVALID`: Invalid counselor type (must be 'human' or 'ai')
- `COUNSELOR_UNAVAILABLE`: Counselor is not currently available
- `AI_SERVICE_ERROR`: AI counselor service temporarily unavailable

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

### System Errors

- `INTERNAL_SERVER_ERROR`: An unexpected error occurred
- `SERVICE_UNAVAILABLE`: Service is temporarily unavailable
- `MAINTENANCE_MODE`: System is under maintenance
- `FEATURE_DISABLED`: This feature is currently disabled
- `CONFIGURATION_ERROR`: System configuration error

## 🚨 Error Handling Best Practices

### Authentication Error Handling

```javascript
async function handleAuthenticatedRequest(url, options) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${firebaseIdToken}`,
      },
    });

    const data = await response.json();

    if (!data.success) {
      switch (data.error.code) {
        case "TOKEN_EXPIRED":
          // Refresh Firebase token and retry
          await refreshFirebaseToken();
          return handleAuthenticatedRequest(url, options);
        case "INSUFFICIENT_PERMISSIONS":
          // Redirect to unauthorized page
          window.location.href = "/unauthorized";
          break;
        default:
          console.error("API Error:", data.error.message);
      }
    }

    return data;
  } catch (error) {
    console.error("Network Error:", error);
    throw error;
  }
}
```

### Validation Error Handling

```javascript
function handleValidationErrors(errorData) {
  if (errorData.error.code === "VALIDATION_ERROR") {
    const details = errorData.error.details;

    // Display field-specific errors
    Object.keys(details).forEach((field) => {
      const errorMessage = details[field];
      displayFieldError(field, errorMessage);
    });
  }
}
```

## 🎯 Architecture Benefits

### 1. Normalized Data Structure

- **Single Source of Truth**: User data stored once in `users/{userId}`
- **Automatic Consistency**: Profile updates reflect everywhere instantly
- **No Data Drift**: Eliminates synchronization issues

### 2. Performance Optimizations

- **On-Demand Population**: User data fetched only when needed
- **Efficient Queries**: Minimal database operations
- **Smart Caching**: Backend handles caching automatically

### 3. Scalability Features

- **Reference-Based Roles**: Event roles store only user references
- **Reduced Storage**: No duplicate user data across collections
- **Better Performance**: Faster queries and reduced bandwidth

### 4. Developer Experience

- **Consistent APIs**: All endpoints follow same response format
- **Clear Error Messages**: Detailed error codes and descriptions
- **Comprehensive Documentation**: Complete API reference with examples

## 📊 Testing Checklist

### ✅ Avatar Persistence Testing

1. Update avatar in profile
2. Logout and login again
3. Verify avatar persists correctly
4. Check avatar appears in event roles

### ✅ Social Links Testing

1. Update social links in profile
2. View event with user as organizer/volunteer
3. Verify social links appear in event roles
4. Test legacy format conversion

### ✅ Data Consistency Testing

1. Update user profile (name, bio, avatar)
2. Check event roles show updated data
3. Verify no stale data in any collection
4. Test real-time data population

### ✅ Role Management Testing

1. Assign role to user for event
2. Update user profile
3. Verify role shows updated user data
4. Test role permissions and expiration

## 🔧 Development Setup

### Environment Variables

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# API Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5174

# Security
ARCJET_KEY=your-arcjet-key
```

### Quick Start

```bash
# Clone repository
git clone https://github.com/your-org/mindquest-backend.git
cd mindquest-backend

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start development server
pnpm dev

# Test API
curl http://localhost:3001/health
```

## 📈 Performance Metrics

### Response Times (Target)

- **Authentication**: < 200ms
- **Profile Updates**: < 300ms
- **Event Retrieval**: < 500ms
- **Role Assignment**: < 400ms

### Throughput (Target)

- **Concurrent Users**: 1000+
- **Requests per Second**: 100+
- **Database Connections**: Pooled and optimized

### Availability

- **Uptime Target**: 99.9%
- **Error Rate**: < 0.1%
- **Recovery Time**: < 5 minutes

## 🛡️ Security Features

### Authentication & Authorization

- **Firebase Authentication**: Industry-standard security
- **Role-Based Access**: User, Admin, SuperAdmin roles
- **Token Validation**: Automatic token verification
- **Session Management**: Secure session handling

### Data Protection

- **Input Validation**: Comprehensive request validation
- **XSS Prevention**: Output sanitization
- **SQL Injection**: Firestore NoSQL protection
- **Rate Limiting**: Adaptive rate limiting by user role

### Monitoring & Analytics

- **Security Analytics**: Real-time threat detection
- **Audit Logging**: Complete action tracking
- **Anomaly Detection**: Suspicious activity alerts
- **Geographic Restrictions**: Location-based access control

## 📞 Support

### Getting Help

1. **Documentation**: Check this comprehensive API documentation
2. **Error Codes**: Review the complete error code reference
3. **Examples**: Use the provided code examples
4. **Testing**: Follow the testing checklist

### Contact Information

- **Email**: support@mindquest.com
- **Repository**: Create an issue on GitHub
- **Documentation**: Check the README.md file
- **Community**: Join our developer Discord

### Reporting Issues

When reporting issues, please include:

- API endpoint and method
- Request payload
- Response received
- Error codes and messages
- Steps to reproduce

---

**Last Updated**: January 2024
**API Version**: 1.0
**Documentation Version**: 2.0
