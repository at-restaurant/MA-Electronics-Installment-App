# Production Deployment Guide

## Pre-Deployment Checklist

### 1. Code Quality
- [ ] All TypeScript errors resolved
- [ ] No console.errors in production code
- [ ] All unused imports removed
- [ ] Code formatted and linted
- [ ] All TODOs addressed or documented

### 2. Testing
- [ ] Test on Chrome (desktop & mobile)
- [ ] Test on Safari (iOS)
- [ ] Test on Firefox
- [ ] Test on Edge
- [ ] Test offline functionality
- [ ] Test with slow network (throttling)
- [ ] Test with 100+ customers
- [ ] Test data export/import
- [ ] Test all notification types
- [ ] Test all WhatsApp integrations

### 3. Performance
- [ ] Lighthouse score >90 on all metrics
- [ ] Images optimized
- [ ] No memory leaks
- [ ] Fast initial load (<3s on 3G)
- [ ] Smooth animations (60fps)

### 4. PWA Requirements
- [ ] Service worker registered
- [ ] Manifest.json configured
- [ ] Icons generated (192x192, 512x512)
- [ ] HTTPS enabled
- [ ] Installable on mobile
- [ ] Works offline
- [ ] Add to homescreen works

### 5. Security
- [ ] No sensitive data in code
- [ ] Environment variables properly set
- [ ] No API keys exposed
- [ ] HTTPS enforced
- [ ] CSP headers configured

### 6. Data Management
- [ ] Backup system tested
- [ ] Storage cleanup verified
- [ ] Data migration plan ready
- [ ] Export format documented

## Deployment Steps

### Option 1: Vercel (Recommended for Next.js)

#### 1. Prepare Repository

```bash
# Ensure code is committed
git add .
git commit -m "Production ready"
git push origin main
```

#### 2. Deploy to Vercel

**Method A: Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

**Method B: Vercel Dashboard**
1. Go to https://vercel.com
2. Click "New Project"
3. Import your Git repository
4. Configure project:
    - Framework Preset: Next.js
    - Build Command: `npm run build`
    - Output Directory: `.next`
5. Add environment variables (if any)
6. Click "Deploy"

#### 3. Configure Domain

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS:
    - Type: A
    - Name: @
    - Value: (Vercel IP)
4. Wait for DNS propagation (up to 48h)

#### 4. Post-Deployment

```bash
# Test production URL
curl -I https://your-domain.com

# Check service worker
# Open: https://your-domain.com
# DevTools → Application → Service Workers
```

### Option 2: Netlify

#### 1. Prepare Build

```bash
# Create netlify.toml
cat > netlify.toml << EOF
[build]
  command = "npm run build"
  publish = ".next"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
EOF
```

#### 2. Deploy

**Method A: Netlify CLI**
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

**Method B: Netlify Dashboard**
1. Go to https://netlify.com
2. Click "Add new site"
3. Connect Git repository
4. Configure build:
    - Build command: `npm run build`
    - Publish directory: `.next`
5. Deploy

#### 3. Configure Domain

1. Go to Site Settings → Domain Management
2. Add custom domain
3. Configure DNS (auto or manual)

### Option 3: Traditional Hosting (cPanel/VPS)

#### 1. Build Static Export

Edit `next.config.js`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
```

```bash
# Build
npm run build

# This creates 'out' directory
```

#### 2. Upload to Server

**Via FTP:**
1. Connect to your server
2. Upload contents of `out` directory to `public_html`
3. Ensure `.htaccess` is configured

**Via SSH:**
```bash
# Compress
tar -czf build.tar.gz out/

# Upload
scp build.tar.gz user@server:/var/www/html/

# Extract on server
ssh user@server
cd /var/www/html
tar -xzf build.tar.gz
mv out/* .
rm -rf out build.tar.gz
```

#### 3. Configure .htaccess

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # HTTPS Redirect
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
  
  # SPA Routing
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Cache Control
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType text/javascript "access plus 1 month"
</IfModule>

# Security Headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
```

### Option 4: Docker

#### 1. Create Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV production
ENV PORT 3000

# Start app
CMD ["node", "server.js"]
```

#### 2. Create docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
```

#### 3. Build and Deploy

```bash
# Build image
docker build -t ma-installment:latest .

# Run locally
docker run -p 3000:3000 ma-installment:latest

# Deploy to server
docker save ma-installment:latest | gzip > ma-installment.tar.gz
scp ma-installment.tar.gz user@server:/tmp/

# On server
ssh user@server
docker load < /tmp/ma-installment.tar.gz
docker run -d -p 80:3000 --restart unless-stopped ma-installment:latest
```

## Post-Deployment Configuration

### 1. SSL Certificate

**Vercel/Netlify:** Automatic

**Traditional Hosting:**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-apache

# Get certificate
sudo certbot --apache -d yourdomain.com
```

### 2. CDN Setup (Optional)

**Cloudflare:**
1. Add site to Cloudflare
2. Update nameservers
3. Enable:
    - Auto Minify (JS, CSS, HTML)
    - Brotli compression
    - Rocket Loader
    - Mobile Redirect

### 3. Monitoring

**Setup Analytics:**
```javascript
// Add to layout.tsx
<script
  dangerouslySetInnerHTML={{
    __html: `
      // Google Analytics
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'GA_MEASUREMENT_ID');
    `,
  }}
/>
```

**Error Tracking (Sentry):**
```bash
npm install @sentry/nextjs

# Initialize
npx @sentry/wizard -i nextjs
```

### 4. Backup Strategy

**Automated Backups:**
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR="/backups"
APP_DIR="/var/www/html"

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/app-$DATE.tar.gz $APP_DIR
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
EOF

chmod +x backup.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

## Monitoring & Maintenance

### 1. Health Checks

Create `pages/api/health.ts`:
```typescript
export default function handler(req, res) {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
}
```

### 2. Uptime Monitoring

**Services:**
- UptimeRobot (free)
- Pingdom
- StatusCake

### 3. Performance Monitoring

```bash
# Run Lighthouse
npm install -g lighthouse

lighthouse https://your-domain.com \
  --output html \
  --output-path ./lighthouse-report.html
```

### 4. Log Monitoring

**PM2 (Node.js apps):**
```bash
# Install PM2
npm install -g pm2

# Start app
pm2 start npm --name "ma-installment" -- start

# Monitor
pm2 logs ma-installment
pm2 monit
```

## Troubleshooting

### Service Worker Not Updating

```javascript
// Add to sw.js
const VERSION = '1.0.1'; // Increment on changes

self.addEventListener('install', (e) => {
  self.skipWaiting();
});
```

### Build Errors

```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### Memory Issues

```bash
# Increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### CORS Issues

Add to `next.config.js`:
```javascript
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Access-Control-Allow-Origin',
          value: '*',
        },
      ],
    },
  ];
},
```

## Rollback Procedure

### Vercel
```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback [deployment-url]
```

### Manual
```bash
# Backup current
mv /var/www/html /var/www/html.backup

# Restore previous
mv /var/www/html.previous /var/www/html

# Restart
systemctl restart nginx
```

## Support & Updates

### Regular Updates
1. Monitor dependencies: `npm outdated`
2. Update packages: `npm update`
3. Test thoroughly
4. Deploy updates

### Emergency Contacts
- Technical Lead: +92 300 1234567
- DevOps: devops@maelectronics.com
- Support: support@maelectronics.com

## Final Checklist

Before going live:
- [ ] Domain configured
- [ ] SSL certificate active
- [ ] Service worker registered
- [ ] PWA installable
- [ ] Notifications working
- [ ] All pages accessible
- [ ] Mobile responsive
- [ ] Performance optimized
- [ ] Error tracking enabled
- [ ] Backups configured
- [ ] Monitoring active
- [ ] Team trained
- [ ] Documentation complete

---

**Last Updated**: January 2026  
**Document Version**: 1.0  
**Production Ready**: ✅