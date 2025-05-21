# MindQuest Backend Development Guide

## Development Environment Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm
- Firebase CLI
- Git
- VS Code (recommended)

### Initial Setup

1. Clone the repository:

```bash
git clone https://github.com/your-org/mindquest.git
cd mindquest/backend
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

4. Configure Firebase:

```bash
firebase login
firebase init
```

### VS Code Extensions

Recommended extensions:

- ESLint
- Prettier
- Firebase
- GitLens
- REST Client

## Project Structure

```
backend/
├── src/
│   ├── config/         # Configuration files
│   │   ├── firebase.ts # Firebase configuration
│   │   └── server.ts   # Server configuration
│   ├── controllers/    # Route controllers
│   │   ├── auth.ts     # Authentication controller
│   │   ├── events.ts   # Events controller
│   │   └── chat.ts     # Chat controller
│   ├── middleware/     # Custom middleware
│   │   ├── auth.ts     # Authentication middleware
│   │   └── rateLimit.ts # Rate limiting middleware
│   ├── models/         # Data models
│   │   ├── User.ts     # User model
│   │   ├── Event.ts    # Event model
│   │   └── Message.ts  # Message model
│   ├── routes/         # API routes
│   │   ├── auth.ts     # Auth routes
│   │   ├── events.ts   # Event routes
│   │   └── chat.ts     # Chat routes
│   ├── services/       # Business logic
│   │   ├── auth.ts     # Auth service
│   │   ├── events.ts   # Event service
│   │   └── chat.ts     # Chat service
│   └── utils/          # Utility functions
│       ├── logger.ts   # Logging utility
│       └── errors.ts   # Error handling
├── tests/              # Test files
├── .env.example        # Environment variables example
├── .eslintrc.js       # ESLint configuration
├── .prettierrc        # Prettier configuration
├── firebase.json      # Firebase configuration
├── package.json       # Project dependencies
└── tsconfig.json      # TypeScript configuration
```

## Coding Standards

### TypeScript

- Use strict mode
- Define types for all variables
- Use interfaces for object shapes
- Use enums for constants
- Avoid `any` type

Example:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

enum UserRole {
  USER = "user",
  ADMIN = "admin",
}

const getUser = async (id: string): Promise<User> => {
  // Implementation
};
```

### Error Handling

- Use custom error classes
- Include error codes
- Add context to errors
- Log errors properly

Example:

```typescript
class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AuthError";
  }
}

try {
  // Implementation
} catch (error) {
  throw new AuthError("Authentication failed", "AUTH_001", { userId, attempt });
}
```

### Logging

- Use structured logging
- Include request ID
- Log at appropriate levels
- Include context

Example:

```typescript
import { logger } from "../utils/logger";

logger.info("User logged in", {
  userId,
  timestamp,
  ip: request.ip,
});

logger.error("Authentication failed", {
  error,
  userId,
  attempt,
});
```

### Testing

- Write unit tests for services
- Write integration tests for routes
- Use test fixtures
- Mock external services

Example:

```typescript
describe("AuthService", () => {
  it("should register new user", async () => {
    const user = await authService.register({
      name: "John Doe",
      email: "john@example.com",
    });
    expect(user).toBeDefined();
    expect(user.email).toBe("john@example.com");
  });
});
```

## Development Workflow

### Git Workflow

1. Create feature branch:

```bash
git checkout -b feature/your-feature
```

2. Make changes and commit:

```bash
git add .
git commit -m "feat: your feature description"
```

3. Push changes:

```bash
git push origin feature/your-feature
```

4. Create Pull Request

### Code Review Process

1. Self-review checklist:

   - [ ] Code follows standards
   - [ ] Tests are written
   - [ ] Documentation is updated
   - [ ] No linting errors
   - [ ] No type errors

2. PR template:
   - Description of changes
   - Related issues
   - Testing performed
   - Breaking changes
   - Screenshots (if applicable)

### Testing

1. Run tests:

```bash
# Run all tests
npm test

# Run specific test
npm test -- tests/auth.test.ts

# Run with coverage
npm run test:coverage
```

2. Test coverage requirements:
   - Minimum 80% coverage
   - All critical paths tested
   - Edge cases covered

### Documentation

1. Update API documentation
2. Update README if needed
3. Add JSDoc comments
4. Update changelog

## Best Practices

### Security

1. Input Validation

```typescript
import { z } from "zod";

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

const validateUser = (data: unknown) => {
  return userSchema.parse(data);
};
```

2. Authentication

```typescript
import { auth } from "../config/firebase";

const verifyToken = async (token: string) => {
  try {
    const decoded = await auth.verifyIdToken(token);
    return decoded;
  } catch (error) {
    throw new AuthError("Invalid token", "AUTH_002");
  }
};
```

3. Rate Limiting

```typescript
import rateLimit from "express-rate-limit";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many attempts, please try again later",
});
```

### Performance

1. Caching

```typescript
import { cache } from "../utils/cache";

const getCachedData = async (key: string) => {
  const cached = await cache.get(key);
  if (cached) return cached;

  const data = await fetchData();
  await cache.set(key, data);
  return data;
};
```

2. Database Optimization

```typescript
// Use indexes
db.collection("users").createIndex({ email: 1 });

// Batch operations
const batch = db.batch();
users.forEach((user) => {
  batch.set(db.collection("users").doc(), user);
});
await batch.commit();
```

3. Error Handling

```typescript
const handleError = (error: Error) => {
  if (error instanceof AuthError) {
    return res.status(401).json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
      },
    });
  }

  logger.error("Unhandled error", { error });
  return res.status(500).json({
    success: false,
    error: {
      message: "Internal server error",
      code: "SERVER_001",
    },
  });
};
```

## Deployment

### Staging

1. Deploy to staging:

```bash
npm run deploy:staging
```

2. Run smoke tests:

```bash
npm run test:smoke
```

### Production

1. Deploy to production:

```bash
npm run deploy:prod
```

2. Monitor deployment:

```bash
firebase deploy --only hosting
```

## Monitoring

### Logging

- Use structured logging
- Include request ID
- Log at appropriate levels
- Include context

### Metrics

- Response times
- Error rates
- Resource usage
- User activity

### Alerts

- Error rate threshold
- Response time threshold
- Resource usage threshold
- Security events

## Troubleshooting

### Common Issues

1. Firebase Authentication

```bash
# Check Firebase configuration
firebase apps:list

# Verify Firebase rules
firebase deploy --only firestore:rules
```

2. Database Connection

```bash
# Check Firestore rules
firebase deploy --only firestore:rules

# Verify environment variables
echo $FIREBASE_PROJECT_ID
```

3. Rate Limiting

```bash
# Check Arcjet configuration
curl -X GET https://api.arcjet.com/v1/limits \
  -H "Authorization: Bearer $ARCJET_API_KEY"
```

### Debugging

1. Local Development

```bash
# Enable debug logging
DEBUG=* npm run dev

# Use VS Code debugger
F5 to start debugging
```

2. Production

```bash
# Check logs
firebase functions:log

# Monitor performance
firebase performance:view
```

## Support

For development support:

1. Check the documentation
2. Review error messages
3. Contact dev@mindquest.com
4. Create an issue in the repository
