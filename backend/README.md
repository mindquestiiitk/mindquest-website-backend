# MindQuest Backend

## Overview

MindQuest is a mental health and wellness platform backend built with Node.js, Express, and Firebase. This backend provides authentication, user management, event handling, and chat functionality.

## Tech Stack

- Node.js
- Express.js
- Firebase (Authentication, Firestore)
- Jest (Testing)
- Arcjet (Rate Limiting)

## Prerequisites

- Node.js (v18 or higher)
- npm or pnpm
- Firebase CLI
- Firebase Project

## Environment Setup

1. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

2. Configure your environment variables:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id

# Server Configuration
PORT=5000
NODE_ENV=development

# Arcjet Configuration
ARCJET_API_KEY=your-arcjet-key
```

3. Set up Firebase client configuration (recommended, no admin privileges required):

```bash
# Run the Firebase client setup script
npm run setup:firebase:client
```

This script will guide you through the process of setting up Firebase client configuration for local development. It will:

- Help you get the necessary Firebase client configuration values
- Configure your environment variables
- Use restricted access methods that don't require admin privileges

Alternatively, if you need admin access for specific operations, you can set up Firebase admin credentials:

```bash
# Run the Firebase admin setup script (only if you need admin privileges)
npm run setup:firebase
```

The client configuration is recommended for most users as it:

- Uses restricted access methods with proper security rules
- Doesn't require admin privileges
- Works with Firebase Security Rules for proper access control
- Is more secure for development environments

## Installation

```bash
# Install dependencies
npm install

# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase
firebase init
```

## Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## API Documentation

### API Endpoints

Below is a comprehensive list of all available endpoints in the API:

#### Authentication Endpoints (`/auth`)

| Method | Endpoint               | Description                             | Auth Required |
|--------|------------------------|-----------------------------------------|--------------|
| POST   | /auth/register         | Register a new user                     | No           |
| POST   | /auth/token-register   | Register with OAuth token               | No           |
| POST   | /auth/login            | Login user                              | No           |
| POST   | /auth/verify-token     | Verify authentication token             | No           |
| POST   | /auth/refresh-token    | Refresh the authentication token        | No           |
| GET    | /auth/me               | Get current user information            | Yes          |
| PUT    | /auth/me               | Update current user information         | Yes          |
| DELETE | /auth/me               | Delete current user account             | Yes          |
| POST   | /auth/logout           | Logout user                             | No           |
| POST   | /auth/forgot-password  | Request password reset                  | No           |
| POST   | /auth/reset-password   | Reset password with token               | No           |
| POST   | /auth/change-password  | Change user password                    | Yes          |
| POST   | /auth/verify-email     | Verify user email                       | No           |
| PUT    | /auth/role/:userId     | Update user role (admin only)           | Yes (Admin)  |
| GET    | /auth/test             | Test authentication routes              | No           |

#### User Endpoints (`/users`)

| Method | Endpoint               | Description                             | Auth Required |
|--------|------------------------|-----------------------------------------|--------------|
| GET    | /users/profile/:userId | Get user profile                        | Yes          |
| PUT    | /users/profile/:userId | Update user profile                     | Yes          |
| PUT    | /users/preferences     | Update user preferences                 | Yes          |
| DELETE | /users/:userId         | Delete user                             | Yes          |
| GET    | /users/search          | Search users                            | Yes          |

#### Event Endpoints (`/events`)

| Method | Endpoint               | Description                             | Auth Required |
|--------|------------------------|-----------------------------------------|--------------|
| GET    | /events                | Get all events                          | No           |
| GET    | /events/:id            | Get event by ID                         | No           |
| POST   | /events/seed           | Seed events data                        | Yes (Admin)  |

#### Admin Endpoints (`/admin`)

| Method | Endpoint                          | Description                      | Auth Required |
|--------|-----------------------------------|----------------------------------|--------------|
| GET    | /admin/stats                      | Get system statistics            | Yes (Admin)  |
| GET    | /admin/users/count                | Get user count                   | Yes (Admin)  |
| GET    | /admin/counselors/count           | Get counselor count              | Yes (Admin)  |
| GET    | /admin/messages/count             | Get message count                | Yes (Admin)  |
| POST   | /admin/events/roles               | Assign event role                | Yes (Admin)  |
| GET    | /admin/events/roles/user/:userId  | Get user roles                   | Yes (Admin)  |
| GET    | /admin/events/roles/event/:eventId| Get event roles                  | Yes (Admin)  |
| POST   | /admin/events/roles/process-expired| Process expired roles          | Yes (Admin)  |
| GET    | /admin/events/roles/legacy        | Get legacy roles                 | Yes (Admin)  |
| POST   | /admin/events                     | Create event                     | Yes (Admin)  |
| PUT    | /admin/events/:eventId            | Update event                     | Yes (Admin)  |

#### Superadmin Endpoints (`/superadmin`)

| Method | Endpoint                    | Description                         | Auth Required    |
|--------|-----------------------------|-------------------------------------|------------------|
| POST   | /superadmin/add             | Add superadmin                      | Yes (SuperAdmin) |
| POST   | /superadmin/remove          | Remove superadmin                   | Yes (SuperAdmin) |
| GET    | /superadmin/list            | List all superadmins                | Yes (SuperAdmin) |
| GET    | /superadmin/check/:userId   | Check if user is superadmin         | Yes (SuperAdmin) |

#### Team Endpoints (`/teams`)

| Method | Endpoint               | Description                             | Auth Required |
|--------|------------------------|-----------------------------------------|--------------|
| GET    | /teams                 | Get all team members                    | No           |
| GET    | /teams/type/:type      | Get team members by type                | No           |
| GET    | /teams/batch/:batch    | Get team members by batch               | No           |
| GET    | /teams/:id             | Get team member by ID                   | No           |
| POST   | /teams/seed            | Seed teams data                         | Yes (Admin)  |

#### Chat Endpoints (`/chat`)

| Method | Endpoint               | Description                             | Auth Required |
|--------|------------------------|-----------------------------------------|--------------|
| POST   | /chat/message          | Send a message                          | Yes          |
| GET    | /chat/history/:userId  | Get chat history with a user            | Yes          |
| GET    | /chat/unread           | Get unread messages                     | Yes          |
| PUT    | /chat/read/:senderId   | Mark messages as read                   | Yes          |

#### Counselor Endpoints (`/counselors`)

| Method | Endpoint                     | Description                       | Auth Required |
|--------|------------------------------|-----------------------------------|--------------|
| POST   | /counselors/:userId          | Create counselor profile          | Yes (Admin)  |
| PUT    | /counselors/availability/:userId | Update counselor availability | Yes (Counselor) |
| PUT    | /counselors/rating/:userId   | Update counselor rating           | Yes          |
| GET    | /counselors/search           | Search counselors                 | Yes          |
| GET    | /counselors/available        | Get available counselors          | Yes          |

#### Merchandise Endpoints (`/merch`)

| Method | Endpoint               | Description                             | Auth Required |
|--------|------------------------|-----------------------------------------|--------------|
| GET    | /merch/products        | Get all merchandise products            | No           |
| GET    | /merch/sales           | Get current merchandise sale            | No           |
| POST   | /merch/order           | Submit merchandise order                | Yes          |

#### Health Check Endpoints (`/health`)

| Method | Endpoint               | Description                             | Auth Required |
|--------|------------------------|-----------------------------------------|--------------|
| GET    | /health                | Basic health check                      | No           |
| GET    | /health/detailed       | Detailed health status                  | Yes (Admin)  |
| GET    | /health/security       | Security health status                  | Yes (Admin)  |

#### OAuth Endpoints (`/oauth`)

| Method | Endpoint               | Description                             | Auth Required |
|--------|------------------------|-----------------------------------------|--------------|
| POST   | /oauth/google          | Google OAuth sign-in                    | No           |

#### Arcjet Security Endpoints (`/api`)

| Method | Endpoint               | Description                             | Auth Required |
|--------|------------------------|-----------------------------------------|--------------|
| POST   | /api/arcjet-protect    | Frontend security protection            | No           |

#### Root Endpoints

| Method | Endpoint               | Description                             | Auth Required |
|--------|------------------------|-----------------------------------------|--------------|
| GET    | /                      | Redirects to health check               | No           |
| GET    | /api-test              | Test API connectivity                   | No           |
| POST   | /register              | Direct registration fallback            | No           |
| POST   | /verify-token          | Direct token verification fallback      | No           |
| POST   | /google-auth           | Direct Google auth fallback             | No           |

### Authentication Methods

The backend supports two authentication methods:

1. **Backend Authentication (Legacy)**: JWT tokens generated by the backend
2. **Client-Side Authentication (Recommended)**: Firebase ID tokens generated by the Firebase client SDK

The backend automatically detects which authentication method is being used and validates the token accordingly. This allows for a smooth transition from backend to client-side authentication.

### API Response Format

The API supports two response formats:

1. **Standard Format** (New applications should use this format):

   ```json
   {
     "success": true,
     "data": { ... },
     "message": "Success message",
     "timestamp": "2023-07-25T12:34:56.789Z"
   }
   ```

2. **Legacy Format** (For backward compatibility):
   ```json
   { ... } // Raw data without wrapping
   ```

To request the standard format, add `?format=wrapped` to your API requests:

```
GET /api/events?format=wrapped
```

### Response Utilities

The backend provides several response utilities:

- `successResponse(res, data, message, statusCode)`: Standard success response
- `errorResponse(res, message, statusCode, errorCode)`: Standard error response
- `paginatedResponse(res, data, page, limit, total, message)`: Paginated response
- `compatResponse(req, res, data, message, statusCode)`: Format-aware response

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

Response:

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

#### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "string",
  "password": "string"
}
```

Response:

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

#### Get Current User

```http
GET /auth/me
Authorization: Bearer <token>
```

Response:

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

### Events

#### Get All Events

```http
GET /events
Authorization: Bearer <token>
```

Response:

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
        "image": "string"
      }
    ]
  }
}
```

#### Get Event by ID

```http
GET /events/:eventId
Authorization: Bearer <token>
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

#### Get Messages

```http
GET /chat/messages/:userId
Authorization: Bearer <token>
```

## Error Handling

The API uses standard HTTP status codes and returns error messages in the following format:

```json
{
  "success": false,
  "error": {
    "message": "string",
    "code": "string"
  }
}
```

Common Error Codes:

- `AUTH_001`: Invalid credentials
- `AUTH_002`: Token expired
- `AUTH_003`: Unauthorized access
- `VAL_001`: Validation error
- `DB_001`: Database error

## Rate Limiting

The API uses Arcjet for rate limiting. Default limits:

- 100 requests per minute per IP
- 1000 requests per hour per user

## Security

- All routes are protected with Firebase Authentication
- Admin authorization uses collection-based access control
- Rate limiting is implemented with Arcjet
- Input validation is enforced
- CORS is configured
- Helmet is used for security headers

### Firebase Authentication Security

For enhanced security, the application supports multiple authentication methods:

1. **Firebase Client SDK (Recommended)**: Uses Firebase Web SDK with restricted permissions

   - Set up with `npm run setup:firebase:client`
   - Uses Firebase Security Rules for proper access control
   - No admin privileges required
   - Ideal for development and production

2. **Firebase Admin SDK (Limited Use)**: For operations that require admin privileges
   - Set up with `npm run setup:firebase`
   - Uses service account credentials
   - Has full access to Firebase resources
   - Should be used only for specific admin operations
   - Access should be restricted in production

The application automatically selects the appropriate authentication method based on the available configuration.

### Admin Authorization

Admin access is controlled by the presence of a user's ID in the `admins` collection, rather than by role claims. This provides better security and more granular control.

To add a user as an admin:

```javascript
// Using the admin-utils helper
import { addUserToAdmins } from "../utils/admin-utils.js";
await addUserToAdmins(userId);

// Or directly
const adminDocRef = db.collection("admins").doc(userId);
await adminDocRef.set({
  userId,
  email: userEmail,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
```

To migrate existing admin users:

```bash
# Run the migration script
node src/scripts/migrate-admins.js

# Deploy updated security rules
node src/scripts/deploy-rules.js
```

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/auth.test.js

# Run tests with coverage
npm run test:coverage
```

## Deployment

1. Build the application:

```bash
npm run build
```

2. Deploy to Firebase:

```bash
firebase deploy
```

## Project Structure

```
backend/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Custom middleware
│   ├── models/         # Data models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   └── utils/          # Utility functions
├── tests/              # Test files
├── .env.example        # Environment variables example
├── firebase.json       # Firebase configuration
└── package.json        # Project dependencies
```

## Contributing

1. Create a new branch:

```bash
git checkout -b feature/your-feature-name
```

2. Make your changes and commit:

```bash
git commit -m "feat: your feature description"
```

3. Push to your branch:

```bash
git push origin feature/your-feature-name
```

4. Create a Pull Request

## Code Style

- Use ESLint for code linting
- Follow Airbnb JavaScript Style Guide
- Use Prettier for code formatting

## Troubleshooting

### Common Issues

1. Firebase Authentication Issues

```bash
# Verify Firebase configuration
firebase apps:list

# Check Firebase rules
firebase deploy --only firestore:rules
```

2. Database Connection Issues

```bash
# Check Firestore rules
firebase deploy --only firestore:rules

# Verify environment variables
echo $FIREBASE_PROJECT_ID
```

3. Firebase Authentication Issues

```bash
# Error: Could not load the default credentials
# This means Firebase can't find your credentials

# For client SDK (recommended, no admin privileges):
npm run setup:firebase:client

# For admin SDK (only if you need admin privileges):
npm run setup:firebase

# Check your Firebase configuration
cat .env | grep FIREBASE

# If you're using the client SDK, make sure you have:
# - FIREBASE_API_KEY
# - FIREBASE_AUTH_DOMAIN
# - FIREBASE_PROJECT_ID

# If you're using the admin SDK, make sure you have:
# - GOOGLE_APPLICATION_CREDENTIALS pointing to your service account file
# - A valid service account file
```

3. Rate Limiting Issues

```bash
# Check Arcjet configuration
curl -X GET https://api.arcjet.com/v1/limits \
  -H "Authorization: Bearer $ARCJET_API_KEY"
```

## Support

For support, please:

1. Check the troubleshooting guide
2. Review the documentation
3. Create an issue in the repository
4. Contact the development team

## License

This project is licensed under the MIT License - see the LICENSE file for details.
