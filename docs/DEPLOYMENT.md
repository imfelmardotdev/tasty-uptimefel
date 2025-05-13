# Deployment Guide

This guide walks through deploying WebMonitor in both development and production environments.

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Git
- A server with SSH access (for production)

## Local Development Deployment

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd uptimefel
   ```

2. Install dependencies:
   ```bash
   # Install frontend dependencies
   npm install

   # Install backend dependencies
   cd server
   npm install
   cd ..
   ```

3. Set up environment files:
   ```bash
   # Frontend environment
   cp .env.example .env

   # Backend environment
   cd server
   cp .env.example .env
   cd ..
   ```

4. Configure development environment variables:

   Frontend (.env):
   ```env
   VITE_API_URL=http://localhost:3001
   VITE_NODE_ENV=development
   VITE_APP_NAME=WebMonitor
   VITE_APP_DESCRIPTION=Website Monitoring Dashboard
   ```

   Backend (server/.env):
   ```env
   PORT=3001
   NODE_ENV=development
   JWT_SECRET=your-development-secret
   DATABASE_PATH=./monitoring.db
   FRONTEND_URL=http://localhost:5173
   ```

5. Initialize the database:
   ```bash
   cd server
   node run-migrations-sqlite.js
   cd ..
   ```

6. Start development servers:
   ```bash
   npm run dev:all
   ```

## Production Deployment

### Server Setup

1. Set up a server with:
   - Node.js and npm
   - NGINX or Apache
   - SSL certificate
   - Process manager (PM2)

2. Install PM2 globally:
   ```bash
   npm install -pm2 -g
   ```

### Application Deployment

1. Clone the repository on the server:
   ```bash
   git clone <repository-url>
   cd uptimefel
   ```

2. Install dependencies:
   ```bash
   npm install
   cd server
   npm install
   cd ..
   ```

3. Create production environment files:

   Frontend (.env):
   ```env
   VITE_API_URL=https://api.yourserver.com
   VITE_NODE_ENV=production
   VITE_APP_NAME=WebMonitor
   VITE_APP_DESCRIPTION=Website Monitoring Dashboard
   ```

   Backend (server/.env):
   ```env
   PORT=3001
   NODE_ENV=production
   JWT_SECRET=your-secure-production-secret
   DATABASE_PATH=/path/to/production/monitoring.db
   FRONTEND_URL=https://yourserver.com
   ```

4. Build the frontend:
   ```bash
   npm run build
   ```

5. Set up NGINX configuration:
   ```nginx
   # Frontend
   server {
       listen 80;
       server_name yourserver.com;
       root /path/to/uptimefel/dist;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
   }

   # Backend API
   server {
       listen 80;
       server_name api.yourserver.com;
       
       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

6. Set up SSL with Let's Encrypt:
   ```bash
   sudo certbot --nginx -d yourserver.com -d api.yourserver.com
   ```

7. Create PM2 configuration (ecosystem.config.js):
   ```javascript
   module.exports = {
     apps: [
       {
         name: 'webmonitor-backend',
         cwd: './server',
         script: 'src/server.js',
         env_production: {
           NODE_ENV: 'production',
           PORT: 3001
         },
         instances: 'max',
         exec_mode: 'cluster',
         max_memory_restart: '300M'
       }
     ]
   };
   ```

8. Start the application with PM2:
   ```bash
   pm2 start ecosystem.config.js --env production
   ```

9. Save PM2 configuration:
   ```bash
   pm2 save
   ```

10. Set up PM2 startup script:
    ```bash
    pm2 startup
    ```

### Database Management

1. Set up regular backups:
   ```bash
   # Create backup script
   echo '#!/bin/bash
   cp /path/to/production/monitoring.db /path/to/backups/monitoring-$(date +%Y%m%d).db
   ' > backup-db.sh

   # Make it executable
   chmod +x backup-db.sh

   # Add to crontab (daily at 2 AM)
   echo "0 2 * * * /path/to/backup-db.sh" | crontab -
   ```

2. Configure database maintenance:
   ```bash
   # Create maintenance script for old data cleanup
   echo '#!/bin/bash
   sqlite3 /path/to/production/monitoring.db "DELETE FROM heartbeats WHERE created_at < date('now', '-30 days');"
   ' > cleanup-db.sh

   # Make it executable
   chmod +x cleanup-db.sh

   # Add to crontab (weekly at 3 AM on Sunday)
   echo "0 3 * * 0 /path/to/cleanup-db.sh" | crontab -
   ```

### Security Considerations

1. Configure firewall rules:
   ```bash
   # Allow only necessary ports
   sudo ufw allow ssh
   sudo ufw allow http
   sudo ufw allow https
   sudo ufw enable
   ```

2. Set up security headers in NGINX:
   ```nginx
   add_header X-Frame-Options "SAMEORIGIN";
   add_header X-XSS-Protection "1; mode=block";
   add_header X-Content-Type-Options "nosniff";
   add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
   ```

3. Configure rate limiting in NGINX:
   ```nginx
   limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
   
   location / {
       limit_req zone=api_limit burst=20 nodelay;
       proxy_pass http://localhost:3001;
   }
   ```

### Monitoring and Maintenance

1. Set up application monitoring:
   ```bash
   pm2 install pm2-logrotate
   pm2 set pm2-logrotate:max_size 10M
   pm2 set pm2-logrotate:retain 7
   ```

2. Configure log rotation for NGINX:
   ```bash
   sudo nano /etc/logrotate.d/nginx
   ```
   ```
   /var/log/nginx/*.log {
       daily
       missingok
       rotate 14
       compress
       delaycompress
       notifempty
       create 0640 www-data adm
       sharedscripts
       prerotate
           if [ -d /etc/logrotate.d/httpd-prerotate ]; then \
               run-parts /etc/logrotate.d/httpd-prerotate; \
           fi \
       endscript
       postrotate
           invoke-rc.d nginx rotate >/dev/null 2>&1
       endscript
   }
   ```

### Automated Deployment

1. Create a deployment script:
   ```bash
   #!/bin/bash
   
   # Pull latest changes
   git pull origin main
   
   # Install dependencies
   npm install
   cd server
   npm install
   cd ..
   
   # Build frontend
   npm run build
   
   # Run migrations
   cd server
   node run-migrations-sqlite.js
   cd ..
   
   # Restart backend
   pm2 restart webmonitor-backend
   
   # Clear NGINX cache
   sudo nginx -s reload
   ```

2. Make the script executable:
   ```bash
   chmod +x deploy.sh
   ```

### Rollback Procedure

1. Create a rollback script:
   ```bash
   #!/bin/bash
   
   if [ -z "$1" ]; then
       echo "Please provide a version to rollback to"
       exit 1
   fi
   
   # Checkout specific version
   git checkout $1
   
   # Reinstall dependencies
   npm install
   cd server
   npm install
   cd ..
   
   # Rebuild frontend
   npm run build
   
   # Restart backend
   pm2 restart webmonitor-backend
   
   # Clear NGINX cache
   sudo nginx -s reload
   ```

2. Make the script executable:
   ```bash
   chmod +x rollback.sh
   ```

### Troubleshooting

Common issues and solutions:

1. Database connection issues:
   ```bash
   # Check database file permissions
   sudo chown -R www-data:www-data /path/to/production/monitoring.db
   sudo chmod 644 /path/to/production/monitoring.db
   ```

2. NGINX configuration issues:
   ```bash
   # Test NGINX configuration
   sudo nginx -t
   
   # Check error logs
   tail -f /var/log/nginx/error.log
   ```

3. Application errors:
   ```bash
   # Check PM2 logs
   pm2 logs webmonitor-backend
   
   # Check system resources
   htop
   ```

Remember to regularly:
- Monitor system resources
- Update dependencies
- Review security patches
- Backup data
- Test recovery procedures
