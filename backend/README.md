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

## API Response Format

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

## API Documentation

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

### Authentication Methods

The backend supports two authentication methods:

1. **Backend Authentication (Legacy)**: JWT tokens generated by the backend
2. **Client-Side Authentication (Recommended)**: Firebase ID tokens generated by the Firebase client SDK

The backend automatically detects which authentication method is being used and validates the token accordingly. This allows for a smooth transition from backend to client-side authentication.

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
