# Contributing to WebMonitor

Thank you for your interest in contributing to WebMonitor! This document provides guidelines and instructions for contributing to the project.

## Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone <your-fork-url>
   cd uptimefel
   ```

3. Install dependencies:
   ```bash
   # Install frontend dependencies
   npm install

   # Install backend dependencies
   cd server
   npm install
   cd ..
   ```

4. Set up environment files:
   ```bash
   # Frontend
   cp .env.example .env

   # Backend
   cd server
   cp .env.example .env
   cd ..
   ```

5. Initialize the database:
   ```bash
   cd server
   node run-migrations-sqlite.js
   cd ..
   ```

## Development Workflow

1. Create a new branch for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Start the development servers:
   ```bash
   npm run dev:all
   ```

3. Make your changes following our coding standards

4. Write or update tests as needed

5. Commit your changes:
   ```bash
   git add .
   git commit -m "feat: description of your changes"
   ```

## Code Style Guidelines

### General

- Use meaningful variable and function names
- Keep functions small and focused
- Add comments for complex logic
- Update documentation for API changes

### Frontend (React + TypeScript)

- Use functional components with hooks
- Follow React best practices
- Maintain type safety
- Use proper component organization
- Implement error boundaries where needed

Example component structure:
```typescript
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface Props {
  title: string;
  onAction: () => void;
}

export const MyComponent: React.FC<Props> = ({ title, onAction }) => {
  const { user } = useAuth();

  return (
    <div className="p-4">
      <h1>{title}</h1>
      <Button onClick={onAction}>
        Click me
      </Button>
    </div>
  );
};
```

### Backend (Node.js)

- Use async/await for asynchronous operations
- Implement proper error handling
- Follow RESTful conventions
- Document API endpoints
- Use typed parameters and responses

Example controller structure:
```javascript
/**
 * Handle website creation
 * @param {Request} req Express request
 * @param {Response} res Express response
 */
async function create(req, res) {
  try {
    const website = await Website.create({
      ...req.body,
      userId: req.user.id
    });
    res.status(201).json(website);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
```

## Testing

### Frontend Testing

- Write unit tests for components
- Test user interactions
- Verify state management
- Test API integration

Example test:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    const handleAction = jest.fn();
    render(<MyComponent title="Test" onAction={handleAction} />);
    
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### Backend Testing

- Unit test controllers and services
- Test database operations
- Verify API endpoints
- Test error handling

Example test:
```javascript
describe('Website Controller', () => {
  it('creates a website successfully', async () => {
    const req = {
      body: { url: 'https://example.com' },
      user: { id: 1 }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    await WebsiteController.create(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
```

## Pull Request Process

1. Update documentation for any new features
2. Add or update tests as needed
3. Ensure all tests pass
4. Update the changelog if applicable
5. Submit the PR with a clear description

### PR Title Format

Use conventional commit format:
- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- `chore: update dependencies`
- `refactor: improve code structure`

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Code refactor
- [ ] Other (please specify)

## Testing
Describe testing done

## Screenshots (if applicable)
Add screenshots

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Code follows style guidelines
- [ ] All tests passing
```

## Code Review Guidelines

### Reviewers Should

- Check code style compliance
- Verify test coverage
- Review documentation updates
- Test functionality locally
- Provide constructive feedback

### Authors Should

- Respond to feedback promptly
- Make requested changes
- Keep PR scope focused
- Rebase on main when needed

## Release Process

1. Version bump following semver
2. Update changelog
3. Create release branch
4. Run tests and checks
5. Merge to main
6. Tag release
7. Deploy to production

## Getting Help

- Check existing issues
- Join project discussions
- Read the documentation
- Ask in project channels

## Community Guidelines

- Be respectful and inclusive
- Help others when possible
- Follow code of conduct
- Participate in discussions
- Share knowledge

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.
