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
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# Server Configuration
PORT=5000
NODE_ENV=development

# Arcjet Configuration
ARCJET_API_KEY=your-arcjet-key
```

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
- Rate limiting is implemented
- Input validation is enforced
- CORS is configured
- Helmet is used for security headers

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
