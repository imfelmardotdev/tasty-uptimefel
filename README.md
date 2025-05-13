# WebMonitor

A comprehensive website monitoring system that tracks uptime, performance, and provides real-time alerts for your web applications.

## Features

- **Website Monitoring**
  - HTTP endpoint monitoring
  - Configurable monitor types and settings
  - Real-time status checks
  - Historical uptime tracking

- **Performance Analytics**
  - Response time tracking
  - Minutely, hourly, and daily statistics
  - Performance trend visualization
  - Heartbeat monitoring

- **Notification System**
  - Webhook-based alerts
  - Customizable notification settings
  - Instant downtime alerts
  - Status change notifications

- **Dashboard Interface**
  - Real-time status display
  - Performance charts and graphs
  - Historical data visualization
  - Website management UI

## Tech Stack

- **Frontend**
  - React with TypeScript
  - Vite for build tooling
  - TailwindCSS for styling
  - Recharts for data visualization
  - React Router for navigation

- **Backend**
  - Node.js with Express
  - SQLite database
  - JWT authentication
  - Node-cron for scheduled tasks

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd uptimefel
   ```

2. Install dependencies
   ```bash
   # Install frontend dependencies
   npm install

   # Install backend dependencies
   cd server
   npm install
   cd ..
   ```

3. Set up environment files
   ```bash
   # Frontend environment
   cp .env.example .env

   # Backend environment
   cd server
   cp .env.example .env
   cd ..
   ```

4. Configure environment variables

   Frontend (.env):
   ```env
   # API Configuration
   VITE_API_URL=http://localhost:3001
   VITE_NODE_ENV=development

   # App Configuration
   VITE_APP_NAME=WebMonitor
   VITE_APP_DESCRIPTION=Website Monitoring Dashboard
   ```

   Backend (server/.env):
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

### Database Setup

1. Initialize the database
   ```bash
   cd server
   node run-migrations-sqlite.js
   cd ..
   ```

### Development

Start both frontend and backend servers:
```bash
npm run dev:all
```

Or run them separately:
```bash
# Frontend only (http://localhost:5173)
npm run dev

# Backend only (http://localhost:3001)
npm run server
```

### Available Scripts

- `npm run dev` - Start frontend development server
- `npm run server` - Start backend server
- `npm run dev:all` - Start both frontend and backend
- `npm run build` - Build frontend for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## API Overview

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Website Monitoring Endpoints
- `GET /api/websites` - List monitored websites
- `POST /api/websites` - Add new website
- `PUT /api/websites/:id` - Update website
- `DELETE /api/websites/:id` - Remove website
- `GET /api/websites/:id/history` - Get monitoring history

### Statistics Endpoints
- `GET /api/stats/minutely` - Get minutely stats
- `GET /api/stats/hourly` - Get hourly stats
- `GET /api/stats/daily` - Get daily stats

### Notification Endpoints
- `GET /api/notifications` - Get notification settings
- `POST /api/notifications` - Update notification settings

## Monitoring Configuration

Websites can be monitored using different strategies:

```json
{
  "monitorType": "http",
  "monitor_config": {
    "method": "GET",
    "timeout": 5000,
    "expectedStatus": 200
  }
}
```

## Security Notes

- Protect your JWT_SECRET in production
- Use HTTPS in production
- Keep your dependencies updated
- Follow security best practices for authentication

## Additional Documentation

- [API Documentation](./docs/API.md)
- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Contributing Guidelines](./CONTRIBUTING.md)

## License

MIT License - see LICENSE file for details
