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
FRONTEND_URL=http://localhost:5173
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

## Project Structure

```
uptimefel/
├── src/             # Frontend source code
├── server/          # Backend server code
│   └── src/
│       ├── auth/    # Authentication
│       ├── database/# Database operations
│       └── monitoring/# Website monitoring
└── public/         # Static assets
```

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install        # Install frontend dependencies
   cd server
   npm install       # Install backend dependencies
   cd ..
   ```

3. Set up environment files:
   ```bash
   # Copy frontend env file
   cp .env.example .env

   # Copy backend env file
   cd server
   cp .env.example .env
   cd ..
   ```

4. Start development servers:
   ```bash
   # Run both frontend and backend
   npm run dev:all

   # Or run them separately:
   npm run dev      # Frontend only
   npm run server   # Backend only
   ```

5. Register the first admin user:
   ```bash
   curl -X POST http://localhost:3001/api/auth/register \
   -H "Content-Type: application/json" \
   -d '{"email":"admin@example.com","password":"your-secure-password"}'
   ```

6. Access the application at http://localhost:5173

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
