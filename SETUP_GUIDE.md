# ProMo-G Platform Setup Guide

This guide will help you set up the ProMo-G platform with all the latest improvements and fixes.

## Prerequisites

- Node.js 18+ 
- PostgreSQL database (via Supabase)
- PayPal Developer Account
- Git

## Installation Steps

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd promo-g
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_WEBHOOK_ID=your_webhook_id
PAYPAL_WEBHOOK_SECRET=your_webhook_secret

# Admin Account
ADMIN_EMAIL=adm01@promoG.com
ADMIN_PASSWORD=Menjo93458s

# Application URLs
FRONTEND_URL=http://localhost:3000
PRODUCTION_URL=https://your-domain.com

# Environment
NODE_ENV=development
PORT=5000
```

### 3. Database Setup

#### Generate and Run Migrations

```bash
# Generate migration files
npm run db:generate

# Push schema to database
npm run db:push

# Run database seeding (creates indexes, admin user, and sample tasks)
npm run db:seed
```

#### Verify Database Setup

```bash
# Open Drizzle Studio to inspect your database
npm run db:studio
```

### 4. PayPal Integration Setup

1. **Create PayPal App**:
   - Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
   - Create a new app
   - Copy Client ID and Secret to `.env`

2. **Configure Webhooks**:
   - In PayPal Dashboard, go to Webhooks
   - Create webhook endpoint: `https://your-domain.com/api/webhooks/paypal`
   - Select these events:
     - `PAYMENT.CAPTURE.COMPLETED`
     - `PAYMENT.CAPTURE.DENIED`
     - `PAYMENT.CAPTURE.REFUNDED`
     - `CHECKOUT.ORDER.APPROVED`
     - `CHECKOUT.ORDER.COMPLETED`
   - Copy Webhook ID to `.env`

### 5. Development Server

```bash
# Start development server
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5000
- API: http://localhost:5000/api
- Database Studio: http://localhost:4983 (when running `npm run db:studio`)

### 6. Production Deployment

#### Build the Application

```bash
# Build client and server
npm run build

# Start production server
npm start
```

#### Environment Variables for Production

Update your `.env` for production:

```env
NODE_ENV=production
DATABASE_URL=your_production_database_url
PAYPAL_CLIENT_ID=your_production_paypal_client_id
PAYPAL_CLIENT_SECRET=your_production_paypal_client_secret
PRODUCTION_URL=https://your-domain.com
```

## Features Implemented

### ✅ Database & Backend
- **Database Migration System**: Drizzle ORM with proper migrations
- **Performance Indexes**: Optimized database queries
- **Global Error Handling**: Consistent API error responses
- **Rate Limiting**: Protection against abuse
- **Request Logging**: Comprehensive API monitoring
- **PayPal Webhooks**: Automated payment processing
- **Token Refresh**: Secure authentication system

### ✅ Frontend & UI
- **Error Boundaries**: Graceful error handling
- **Loading States**: Improved user experience
- **PWA Support**: Offline functionality
- **Form Validation**: Enhanced input validation
- **Responsive Design**: Mobile-first approach

### ✅ Security & Performance
- **CORS Configuration**: Secure cross-origin requests
- **Input Sanitization**: XSS protection
- **Background Sync**: Offline task submission
- **Service Worker**: Advanced caching strategies

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Token refresh

### Tasks
- `GET /api/tasks/orientation` - Get orientation tasks
- `POST /api/user-tasks` - Submit task completion
- `GET /api/user-tasks/:userId` - Get user tasks

### Payments
- `POST /api/paypal/order` - Create PayPal order
- `POST /api/paypal/order/:orderID/capture` - Capture payment
- `POST /api/webhooks/paypal` - PayPal webhook handler
- `POST /api/payments/retry/:orderId` - Retry failed payment

### Admin
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/:id/approve` - Approve user
- `GET /api/admin/tasks/pending` - Get pending tasks

## Database Schema

### Core Tables
- **users** - User accounts with roles and subscription info
- **subscriptions** - Active subscription records
- **tasks** - Available tasks across categories
- **user_tasks** - Task completion tracking
- **wallets** - User balance and earnings
- **transactions** - Financial transaction history
- **withdrawals** - Withdrawal requests
- **orders** - PayPal order records
- **notifications** - System notifications

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check DATABASE_URL format
   # Ensure database is accessible
   npm run db:push
   ```

2. **PayPal Integration Issues**
   ```bash
   # Verify PayPal credentials in .env
   # Check webhook URL is accessible
   # Ensure webhook events are configured
   ```

3. **Build Errors**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Service Worker Issues**
   ```bash
   # Clear browser cache
   # Check browser console for SW errors
   # Verify manifest.json is accessible
   ```

### Development Tips

1. **Database Changes**
   ```bash
   # After schema changes
   npm run db:generate
   npm run db:push
   ```

2. **Testing Payments**
   - Use PayPal sandbox for testing
   - Test webhook endpoints with ngrok for local development

3. **PWA Testing**
   - Test offline functionality
   - Verify service worker registration
   - Check cache strategies

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review browser console for errors
3. Check server logs for API issues
4. Verify environment variables are set correctly

## Security Notes

- Admin password is hashed with bcrypt
- All API endpoints use proper authentication
- Rate limiting prevents abuse
- Input sanitization prevents XSS
- CORS configured for security
- Secure cookie settings in production

## Performance Optimizations

- Database indexes for fast queries
- Service worker caching strategies
- Background sync for offline support
- Optimized bundle sizes
- Lazy loading components
- Request deduplication