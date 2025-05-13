# API Documentation

This document provides detailed information about the WebMonitor API endpoints.

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Authentication Endpoints

#### Register New User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password"
}

Response 201:
{
  "message": "User registered successfully",
  "userId": "123"
}
```

#### User Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password"
}

Response 200:
{
  "token": "your-jwt-token",
  "user": {
    "id": "123",
    "email": "user@example.com"
  }
}
```

## Website Management

### List Monitored Websites
```http
GET /api/websites

Response 200:
[
  {
    "id": 1,
    "url": "https://example.com",
    "name": "Example Site",
    "monitorType": "http",
    "monitor_config": {
      "method": "GET",
      "timeout": 5000,
      "expectedStatus": 200
    },
    "active": true,
    "lastChecked": "2025-05-13T13:00:00Z",
    "status": "up"
  }
]
```

### Add New Website
```http
POST /api/websites
Content-Type: application/json

{
  "url": "https://example.com",
  "name": "Example Site",
  "monitorType": "http",
  "monitor_config": {
    "method": "GET",
    "timeout": 5000,
    "expectedStatus": 200
  }
}

Response 201:
{
  "id": 1,
  "url": "https://example.com",
  "name": "Example Site",
  "monitorType": "http",
  "monitor_config": {
    "method": "GET",
    "timeout": 5000,
    "expectedStatus": 200
  },
  "active": true
}
```

### Update Website
```http
PUT /api/websites/:id
Content-Type: application/json

{
  "name": "Updated Site Name",
  "active": false
}

Response 200:
{
  "id": 1,
  "name": "Updated Site Name",
  "active": false
  // ... other fields
}
```

### Delete Website
```http
DELETE /api/websites/:id

Response 204
```

### Get Website History
```http
GET /api/websites/:id/history?limit=100&offset=0

Response 200:
{
  "history": [
    {
      "timestamp": "2025-05-13T13:00:00Z",
      "status": "up",
      "responseTime": 234,
      "statusCode": 200
    }
  ],
  "total": 1000
}
```

## Statistics

### Get Minutely Stats
```http
GET /api/stats/minutely
Query Parameters:
- websiteId: number
- from: ISO date string
- to: ISO date string

Response 200:
{
  "stats": [
    {
      "timestamp": "2025-05-13T13:00:00Z",
      "uptime": 100,
      "avgResponseTime": 234,
      "checksCount": 60
    }
  ]
}
```

### Get Hourly Stats
```http
GET /api/stats/hourly
Query Parameters: (same as minutely)

Response 200: (same format as minutely)
```

### Get Daily Stats
```http
GET /api/stats/daily
Query Parameters: (same as minutely)

Response 200: (same format as minutely)
```

## Notifications

### Get Notification Settings
```http
GET /api/notifications

Response 200:
{
  "webhook": {
    "url": "https://hooks.example.com/notify",
    "enabled": true
  },
  "alerts": {
    "downtime": true,
    "performance": true,
    "recovery": true
  }
}
```

### Update Notification Settings
```http
POST /api/notifications
Content-Type: application/json

{
  "webhook": {
    "url": "https://hooks.example.com/notify",
    "enabled": true
  },
  "alerts": {
    "downtime": true,
    "performance": true,
    "recovery": true
  }
}

Response 200:
{
  "message": "Notification settings updated successfully"
}
```

## Public Status

### Get Public Status Page
```http
GET /api/public/status/:websiteId

Response 200:
{
  "name": "Example Site",
  "url": "https://example.com",
  "currentStatus": "up",
  "uptime": {
    "24h": 99.9,
    "7d": 99.8,
    "30d": 99.7
  },
  "recentIncidents": [
    {
      "startTime": "2025-05-13T12:00:00Z",
      "endTime": "2025-05-13T12:05:00Z",
      "duration": 300,
      "type": "downtime"
    }
  ]
}
```

## Error Responses

### Common Error Formats
```http
400 Bad Request:
{
  "error": "Invalid request parameters",
  "details": {
    "field": "error description"
  }
}

401 Unauthorized:
{
  "error": "Authentication required"
}

403 Forbidden:
{
  "error": "Insufficient permissions"
}

404 Not Found:
{
  "error": "Resource not found"
}

500 Internal Server Error:
{
  "error": "Internal server error",
  "requestId": "xyz-123" // for tracking
}
