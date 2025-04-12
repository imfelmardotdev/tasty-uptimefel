# WebMonitor

A web application for monitoring website uptime and performance.

## Environment Setup

### Backend (.env)

```env
# Server Configuration
PORT=3001
NODE_ENV=development
JWT_SECRET=your-very-secure-secret

# Database Configuration
DATABASE_PATH=./monitoring.db

# CORS Configuration
FRONTEND_URL=http://localhost:5174
```

### Frontend (.env)

```env
# API Configuration
VITE_API_URL=http://localhost:3001
VITE_NODE_ENV=development

# App Configuration
VITE_APP_NAME=WebMonitor
VITE_APP_DESCRIPTION=Website Monitoring Dashboard
```

## Development Setup

1. Clone the repository
2. Set up backend:
   ```bash
   cd monitoring-server
   cp .env.example .env    # Copy example env file
   npm install
   npm start
   ```

3. Set up frontend:
   ```bash
   cd uptimefel
   cp .env.example .env    # Copy example env file
   npm install
   npm run dev
   ```

4. Register the first admin user:
   ```bash
   curl -X POST http://localhost:3001/api/auth/register \
   -H "Content-Type: application/json" \
   -d '{"email":"admin@example.com","password":"your-secure-password"}'
   ```

5. Access the application at http://localhost:5174

## Production Deployment

For production deployment, update the environment variables:

### Backend Production Settings:
```env
NODE_ENV=production
JWT_SECRET=your-actual-secure-secret
FRONTEND_URL=https://your-frontend-domain.com
```

### Frontend Production Settings:
```env
VITE_NODE_ENV=production
VITE_API_URL=https://your-api-domain.com
```

## Security

- Environment files (.env) contain sensitive information and should never be committed to the repository
- The .env.example files serve as templates and should be copied to .env files
- Add to your .gitignore:
  ```
  # Environment files
  .env
  .env.local
  .env.*.local
  ```
