# Contributing to Umuo App

Thank you for your interest in contributing to Umuo App! This guide will help you understand the development workflow and best practices for this project.

## 🚀 Quick Start

### Prerequisites

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0 (preferred package manager)
- **Git**: Latest version

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/umuo-app.git
   cd umuo-app
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Add your GROQ_API_KEY to .env.local
   ```

4. **Start Development Server**
   ```bash
   pnpm dev
   ```

## 📁 Project Structure

```
umuo-app/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── api/             # API routes
│   │   ├── globals.css      # Global styles
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Home page
│   ├── components/          # React components
│   │   ├── features/        # Feature-specific components
│   │   ├── layout/          # Layout components
│   │   ├── providers/       # React providers
│   │   └── ui/              # Reusable UI components
│   ├── hooks/               # Custom React hooks
│   │   ├── api/            # API-related hooks
│   │   ├── db/             # Database hooks
│   │   └── ui/             # UI-related hooks
│   ├── lib/                 # Utilities and libraries
│   │   ├── ai/             # AI service integrations
│   │   ├── db/             # Database operations
│   │   └── utils/          # Utility functions
│   ├── types/               # TypeScript type definitions
│   └── styles/              # Style-related files
├── public/                  # Static assets
├── tests/                   # Test files
└── docs/                    # Documentation
```

## 🛠️ Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number-description
```

### 2. Make Your Changes

Follow the coding standards and best practices outlined in this guide.

### 3. Run Quality Checks

```bash
# Run all quality checks
pnpm ci:build

# Or run individually
pnpm lint          # Lint code
pnpm format         # Format code
pnpm type-check     # Type checking
pnpm test           # Run tests
pnpm build          # Build for production
```

### 4. Commit Your Changes

```bash
git add .
git commit -m "feat: add new feature description"
```

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Create a pull request with a clear description of your changes.

## 📏 Coding Standards

### Code Style

- **Language**: English for all comments and documentation
- **Formatter**: Biome.js (configured in `biome.json`)
- **Line Width**: 100 characters
- **Indentation**: 2 spaces (no tabs)
- **Quotes**: Single quotes for strings

### TypeScript

- **Strict Mode**: Enabled
- **Type Safety**: Use `unknown` instead of `any` when possible
- **Interfaces**: Use `interface` for object shapes, `type` for unions/primitives
- **Function Types**: Use arrow function syntax for type definitions

```typescript
// ✅ Good
interface User {
  id: number;
  name: string;
}

type Status = 'pending' | 'processing' | 'completed';

const fetchUser = async (id: number): Promise<User | null> => {
  return null;
};

// ❌ Bad
function fetchUser(id: any): any {
  return null;
}
```

### Component Patterns

#### Functional Components

```typescript
// ✅ Good: Component with clear props interface
interface Props {
  title: string;
  onAction?: () => void;
}

export const Component: React.FC<Props> = ({ title, onAction }) => {
  return <div>{title}</div>;
};
```

#### Custom Hooks

```typescript
// ✅ Good: Custom hook with clear return type
interface UseDataReturn {
  data: Data | null;
  loading: boolean;
  error: string | null;
}

export const useData = (id: number): UseDataReturn => {
  // Implementation
};
```

### Database Operations

Use the unified `DBUtils` class for all database operations:

```typescript
// ✅ Good: Using DBUtils
import { DBUtils } from '@/lib/db/db';

const file = await DBUtils.getFile(fileId);
await DBUtils.addFile(fileData);

// ❌ Bad: Direct database access
await db.files.get(fileId);
```

### API Routes

Follow this pattern for API routes:

```typescript
import { z } from 'zod';
import { apiError, apiSuccess } from '@/lib/utils/api-response';

// 1. Validation schemas
const schema = z.object({
  param: z.string(),
});

// 2. Helper functions
function validateInput(input: unknown) {
  return schema.safeParse(input);
}

// 3. Main handler
export async function POST(request: NextRequest) {
  try {
    const input = await request.json();
    const validation = validateInput(input);

    if (!validation.success) {
      return apiError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        statusCode: 400,
      });
    }

    // Process request
    const result = await processData(validation.data);

    return apiSuccess(result);
  } catch (error) {
    return apiError({
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      statusCode: 500,
    });
  }
}
```

## 🧪 Testing

### Test Structure

```
src/
├── __tests__/           # Global test setup
├── app/
│   └── api/
│       └── __tests__/   # API route tests
├── components/
│   └── __tests__/       # Component tests
├── hooks/
│   └── __tests__/       # Hook tests
└── lib/
    └── __tests__/       # Utility tests
```

### Testing Guidelines

1. **Test Coverage**: Aim for >70% coverage on critical paths
2. **Test Structure**: Use `describe`, `it`, `expect` pattern
3. **Mocking**: Mock external dependencies (API, database, etc.)

```typescript
// ✅ Good: Test example
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Component from './Component';

vi.mock('@/lib/db/db', () => ({
  DBUtils: {
    getFile: vi.fn(),
  },
}));

describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />);
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });
});
```

## 🔧 Architecture Guidelines

### State Management

- **Server State**: Use TanStack Query for API calls and server state
- **Client State**: Use React hooks for local component state
- **Global State**: Use React Context for application-wide state

### Data Flow

```
User Action → React Component → Hook → API Route → Database
    ↓              ↓               ↓        ↓         ↓
UI Update ← Query Cache ← TanStack Query ← Response ← Result
```

### Error Handling

Use the centralized error handling system:

```typescript
import { handleError } from '@/lib/utils/error-handler';

try {
  // Risky operation
} catch (error) {
  throw handleError(error, 'OperationContext');
}
```

## 📝 Documentation

### Comments

- **Language**: English only
- **Purpose**: Explain "why" not "what"
- **Style**: Use JSDoc for public functions

```typescript
/**
 * Fetches user data from the database
 * @param id - User ID to fetch
 * @returns Promise resolving to user data or null if not found
 * @throws DatabaseError when database connection fails
 */
const fetchUser = async (id: number): Promise<User | null> => {
  // Implementation
};
```

### README Updates

When adding new features:
1. Update the main README if needed
2. Add documentation for new APIs
3. Update component prop types with clear descriptions

## 🚀 Performance Guidelines

### Database Operations

- Use batch operations for large datasets
- Implement proper indexing
- Use transactions for complex operations

### React Components

- Use `useCallback` for event handlers
- Use `useMemo` for expensive computations
- Implement proper loading and error states
- Use React.lazy for code splitting when appropriate

### Bundle Size

- Import only what you need from libraries
- Use dynamic imports for large dependencies
- Optimize images and assets

## 🔐 Security Considerations

- Validate all user inputs with Zod schemas
- Implement rate limiting for API endpoints
- Never expose sensitive data in client-side code
- Use environment variables for configuration

## 📦 Release Process

### Version Management

- Follow Semantic Versioning (semver)
- Update version in `package.json`
- Create git tags for releases

### Deployment

1. **Preview**: `pnpm deploy:preview` for preview deployments
2. **Production**: `pnpm deploy` for production deployments
3. **Build Check**: `pnpm build` must pass before deployment

## 🤝 Code Review Guidelines

### Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests are included and passing
- [ ] TypeScript types are correct
- [ ] Documentation is updated
- [ ] Performance implications considered
- [ ] Security implications considered
- [ ] Breaking changes are documented

### Review Process

1. **Self-Review**: Review your own code first
2. **Automated Checks**: Ensure CI passes
3. **Peer Review**: Request review from team members
4. **Iterate**: Address feedback and update

## 🆘 Getting Help

### Issues and Questions

- **GitHub Issues**: For bug reports and feature requests
- **Discussions**: For questions and general discussions
- **Documentation**: Check existing docs first

### Development Questions

Feel free to ask questions in pull requests or GitHub discussions. We're here to help!

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to Umuo App! Your contributions help make this project better for everyone. 🎉