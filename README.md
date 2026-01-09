# MA Electronics Installment Manager

A modern, production-ready Progressive Web App (PWA) for managing customer installment payments.

## ✨ Features

### Core Features
- 📊 **Multi-Profile Support** - Manage multiple businesses from one app
- 👥 **Customer Management** - Add customers with photos, CNIC, and documents
- 💰 **Payment Tracking** - Track daily, weekly, and monthly installments
- 📱 **WhatsApp Integration** - Send reminders and alerts via WhatsApp
- 🔔 **Smart Notifications** - Payment reminders and overdue alerts
- 📈 **Dashboard Analytics** - Real-time statistics and insights
- 🌓 **Dark Mode** - Light and dark theme support
- 💾 **Offline Support** - Works offline with data sync
- 📤 **Data Export/Import** - Backup and restore your data

### Technical Features
- **PWA** - Install as native app on any device
- **Responsive Design** - Works on mobile, tablet, and desktop
- **Local Storage** - Fast, secure data storage
- **Service Worker** - Offline functionality and caching
- **Push Notifications** - Browser notifications for reminders
- **Progressive Enhancement** - Works on older browsers

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd ma-installment-app
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Run development server**
```bash
npm run dev
# or
yarn dev
```

4. **Open browser**
```
http://localhost:3000
```

## 📦 Production Build

### Build for Production

```bash
npm run build
# or
yarn build
```

### Test Production Build Locally

```bash
npm run start
# or
yarn start
```

## 🌐 Deployment Options

### Option 1: Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Follow prompts to link your project

### Option 2: Netlify

1. Install Netlify CLI:
```bash
npm i -g netlify-cli
```

2. Build and deploy:
```bash
npm run build
netlify deploy --prod --dir=.next
```

### Option 3: Traditional Hosting

1. Build the project:
```bash
npm run build
```

2. Export static files (if using static export):
```bash
npm run export
```

3. Upload the `out` directory to your hosting provider

### Option 4: Docker

1. Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

2. Build and run:
```bash
docker build -t ma-installment .
docker run -p 3000:3000 ma-installment
```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file:

```env
# App Configuration
NEXT_PUBLIC_APP_NAME="MA Electronics Installment"
NEXT_PUBLIC_APP_VERSION="1.0.0"

# Optional: Supabase (for future cloud sync)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

### PWA Configuration

Edit `public/manifest.json` to customize:
- App name and description
- Theme colors
- Icons
- Shortcuts

### Notification Settings

Notifications are configured in `src/lib/notificationManager.ts`:
- Daily reminders check every hour
- Overdue alerts check twice daily
- Daily summary sent at 8 PM

## 📱 Features Guide

### Multi-Profile Setup
1. Open Settings
2. Click "Manage Profiles"
3. Add new profiles for different businesses
4. Switch between profiles anytime

### Adding Customers
1. Go to Customers tab
2. Click "+" button
3. Fill in customer details
4. Optionally add photo and ID document
5. Set installment amount and frequency

### Daily Collection
1. Go to Daily tab
2. Select date
3. Tap customer cards to mark payments
4. Payments are automatically recorded

### Managing Payments
1. Open customer details
2. View payment history
3. Add manual payments
4. Delete incorrect payments

### WhatsApp Integration
- Send welcome messages to new customers
- Send payment reminders
- Send overdue alerts
- Send completion congratulations

### Data Management
- **Export**: Settings → Export Data (creates JSON backup)
- **Import**: Settings → Import Data (restore from backup)
- **Cleanup**: Automatically removes old records when storage is full

## 🔔 Notification Setup

### Enable Notifications

1. Open app in browser
2. Allow notification permission when prompted
3. Go to Settings → Notifications
4. Enable desired notification types
5. Test notifications with "Test Notification" button

### Notification Types

- **Payment Reminders**: Daily checks for due payments
- **Overdue Alerts**: Alerts for payments overdue >7 days
- **Daily Summary**: End-of-day summary at 8 PM

## 📊 Storage Management

### Storage Limits
- Default: ~5MB per domain (varies by browser)
- App monitors usage and warns at 80%
- Automatic cleanup available

### Cleanup Process
1. Keeps all active customers
2. Keeps last 50 completed customers
3. Removes payments older than 1 year for completed customers

### Manual Cleanup
Settings → Storage Usage → Clean Up Old Records

## 🐛 Troubleshooting

### Notifications Not Working

**Check 1**: Browser permissions
- Go to browser settings
- Find site permissions
- Enable notifications

**Check 2**: App settings
- Open Settings
- Go to Notifications
- Enable notifications

**Check 3**: Test notification
- Click "Test Notification" button
- If fails, check browser console

### Data Not Saving

**Check 1**: Storage space
- Settings → Storage Usage
- If >80%, run cleanup

**Check 2**: Browser storage
- Clear browser cache
- Try incognito mode to test

**Check 3**: Console errors
- Open browser DevTools (F12)
- Check Console tab for errors

### App Not Installing

**Check 1**: HTTPS required
- PWA requires HTTPS (or localhost)
- Check URL starts with https://

**Check 2**: Service worker
- Open DevTools → Application → Service Workers
- Check if registered

**Check 3**: Manifest
- Open DevTools → Application → Manifest
- Verify manifest loads correctly

### WhatsApp Not Opening

**Check 1**: Phone number format
- Must include country code
- Remove spaces and special characters
- Format: +923001234567

**Check 2**: WhatsApp installed
- Ensure WhatsApp is installed on device
- Try WhatsApp Web if on desktop

## 🔐 Security Best Practices

### Data Privacy
- All data stored locally on device
- No external servers (unless Supabase enabled)
- No data transmission over network
- User has full control of data

### Backup Recommendations
1. Export data weekly
2. Store backups securely
3. Test restore process periodically

### Access Control
- No built-in authentication (local app)
- Device security relies on device lock
- Consider device encryption

## 📈 Performance Optimization

### Already Implemented
- Code splitting
- Image optimization
- Lazy loading
- Service worker caching
- Minimal dependencies

### Further Optimization
1. **Images**: Compress customer photos before saving
2. **Storage**: Regular cleanup of old data
3. **Caching**: Service worker caches all static assets

## 🛠 Development

### Tech Stack
- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Storage**: localStorage
- **PWA**: Custom service worker

### Project Structure
```
src/
├── app/              # Next.js pages
├── components/       # React components
├── lib/             # Utilities and services
├── hooks/           # Custom React hooks
└── types/           # TypeScript types

public/
├── sw.js            # Service worker
├── manifest.json    # PWA manifest
└── icons/           # App icons
```

### Adding Features

1. **New Page**: Create in `src/app/`
2. **New Component**: Create in `src/components/`
3. **New Utility**: Create in `src/lib/`
4. **Update Types**: Edit `src/types/index.ts`

## 📝 License

This project is proprietary software for MA Electronics.

## 🤝 Support

For support or questions:
- Email: support@maelectronics.com
- Phone: +92 300 1234567

## 🎯 Roadmap

### Version 1.1 (Planned)
- [ ] Cloud sync with Supabase
- [ ] Multiple payment methods tracking
- [ ] Advanced analytics and reports
- [ ] Customer categories
- [ ] SMS integration

### Version 1.2 (Future)
- [ ] Multi-language support (Urdu full support)
- [ ] Receipt printing
- [ ] QR code payments
- [ ] Staff management
- [ ] Advanced permissions

## ✅ Production Checklist

Before deploying to production:

- [ ] Test on multiple devices
- [ ] Test offline functionality
- [ ] Test notification system
- [ ] Verify data export/import
- [ ] Test with large dataset (100+ customers)
- [ ] Check performance (Lighthouse score >90)
- [ ] Verify PWA installability
- [ ] Test all WhatsApp integrations
- [ ] Backup data regularly
- [ ] Monitor error logs
- [ ] Set up analytics (optional)
- [ ] Update manifest with correct URLs
- [ ] Generate proper app icons
- [ ] Test on iOS and Android
- [ ] Verify HTTPS certificate

## 📞 Contact

**Developer**: MA Electronics Development Team  
**Email**: dev@maelectronics.com  
**Website**: https://maelectronics.com

---

**Version**: 1.0.0  
**Last Updated**: January 2026  
**Status**: Production Ready ✅