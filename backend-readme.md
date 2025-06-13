# ColorPro Backend API

> Professional Color Analysis Platform - Backend Service

A comprehensive, enterprise-grade backend API for the ColorPro platform, providing color analysis, user management, payment processing, and personalized styling recommendations.

## 🌟 Features

### 🎨 Core Functionality
- **AI-Powered Color Analysis**: Advanced computer vision for seasonal color analysis
- **Multi-Photo Processing**: Face selfies, full body, natural light analysis
- **Personalized Recommendations**: Color palettes, makeup, wardrobe, and shopping suggestions
- **Professional Reports**: PDF generation with personalized styling guides

### 🔐 Authentication & Security
- **Firebase Authentication**: Secure user authentication with social login support
- **JWT Tokens**: Stateless authentication with refresh token support
- **Role-Based Access Control**: Admin, user, and subscription-based permissions
- **Rate Limiting**: API protection against abuse and DDoS attacks

### 💳 Payment & Subscriptions
- **Stripe Integration**: Secure payment processing with multiple currencies
- **Subscription Management**: Bronze, Silver, Gold tier support
- **Webhook Handling**: Real-time payment status updates
- **Refund Processing**: Automated and manual refund capabilities

### 🌐 International Support
- **Multi-Language**: English, Spanish, Portuguese support
- **Localized Content**: Dynamic translation with i18next
- **Currency Support**: USD, EUR, GBP payment processing
- **Regional Features**: Localized styling recommendations

### 📧 Communication
- **Email Service**: SendGrid integration for transactional emails
- **Template System**: Professional email templates for all user interactions
- **Notification Management**: Configurable email and push notifications

### ☁️ Cloud Infrastructure
- **AWS S3 Integration**: Secure file storage and image processing
- **MongoDB Atlas**: Scalable database with full-text search
- **Redis Caching**: High-performance session and data caching
- **Docker Support**: Complete containerization for easy deployment

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MongoDB 6.0+
- Redis 7+
- AWS S3 account
- Stripe account
- SendGrid account
- Firebase project

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/colorpro/backend.git
cd colorpro-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Configuration**
```bash
cp env-template.md .env
# Edit .env with your actual configuration values
```

4. **Database Setup**
```bash
# Start MongoDB and Redis (if running locally)
mongod
redis-server

# Or use Docker
docker-compose up mongodb redis -d
```

5. **Start Development Server**
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## 🐳 Docker Deployment

### Development
```bash
# Start all services including admin tools
docker-compose --profile development up -d

# View logs
docker-compose logs -f colorpro-api
```

### Production
```bash
# Build and start production services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --profile production up -d

# Scale API instances
docker-compose up --scale colorpro-api=3
```

## 📚 API Documentation

### Base URL
- Development: `http://localhost:3000/api/v1`
- Production: `https://api.colorpro.com/api/v1`

### Core Endpoints

#### Authentication
```
POST /auth/login              # User login
POST /auth/register           # User registration
POST /auth/refresh            # Refresh access token
POST /auth/logout             # User logout
POST /auth/forgot-password    # Password reset request
POST /auth/reset-password     # Password reset confirmation
```

#### User Management
```
GET    /users/profile         # Get user profile
PUT    /users/profile         # Update user profile
POST   /users/profile/image   # Upload profile image
PUT    /users/password        # Change password
DELETE /users/account         # Delete user account
```

#### Color Analysis
```
POST   /analysis              # Create new color analysis
GET    /analysis              # Get user's analyses
GET    /analysis/:id          # Get specific analysis
POST   /analysis/:id/photos   # Upload analysis photos
GET    /analysis/:id/report   # Download PDF report
DELETE /analysis/:id          # Delete analysis
```

#### Payment & Subscriptions
```
GET    /payments/plans         # Get subscription plans
POST   /payments/intent        # Create payment intent
POST   /payments/subscription  # Create subscription
PUT    /payments/subscription  # Update subscription
DELETE /payments/subscription  # Cancel subscription
POST   /payments/webhook       # Stripe webhook endpoint
```

### Response Format
All API responses follow this structure:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### Error Responses
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Email is required",
      "value": ""
    }
  ]
}
```

## 🏗️ Architecture

### Technology Stack
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with modern middleware
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Redis for session and data caching
- **Authentication**: Firebase Auth + JWT tokens
- **Payments**: Stripe with webhook support
- **File Storage**: AWS S3 with CloudFront CDN
- **Email**: SendGrid with template engine
- **AI/ML**: TensorFlow.js for color analysis
- **Image Processing**: Sharp for optimization
- **PDF Generation**: Puppeteer for reports
- **Internationalization**: i18next with multiple languages
- **Validation**: Joi + Express Validator
- **Logging**: Winston with structured logging
- **Monitoring**: Custom health checks and metrics

### Project Structure
```
colorpro-backend/
├── src/
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Express middleware
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic services
│   ├── utils/           # Utility functions
│   └── types/           # TypeScript definitions
├── config/              # Configuration files
├── locales/             # Translation files
├── logs/                # Application logs
├── uploads/             # Temporary file storage
├── scripts/             # Database and deployment scripts
├── tests/               # Test suites
└── docs/                # Additional documentation
```

### Database Schema

#### Users Collection
```javascript
{
  _id: ObjectId,
  firebaseUid: String,
  email: String,
  name: String,
  profileImage: String,
  phone: String,
  dateOfBirth: Date,
  gender: String,
  language: String,
  preferences: {
    notifications: { email: Boolean, push: Boolean, marketing: Boolean },
    theme: String,
    colorSystem: String,
    privacySettings: { profileVisibility: String, analyticsOptOut: Boolean }
  },
  subscription: {
    type: String,
    tier: String,
    status: String,
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: Boolean,
    trialEnd: Date
  },
  createdAt: Date,
  updatedAt: Date,
  lastLoginAt: Date,
  isActive: Boolean,
  isEmailVerified: Boolean
}
```

#### Color Analyses Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  sessionId: String,
  status: String, // pending, processing, completed, failed
  analysisType: String,
  photos: [{
    type: String,
    url: String,
    s3Key: String,
    originalName: String,
    mimeType: String,
    size: Number,
    metadata: Object
  }],
  personalData: {
    age: Number,
    skinTone: String,
    eyeColor: String,
    hairColor: String,
    hairTexture: String,
    lifestyle: String,
    styleGoals: [String],
    budget: String,
    bodyType: String
  },
  results: {
    season: {
      primary: String,
      secondary: String,
      subtype: String,
      confidence: Number,
      characteristics: [String],
      description: String
    },
    colorPalette: {
      primary: [ColorObject],
      neutral: [ColorObject],
      accent: [ColorObject],
      avoid: [ColorObject],
      bestColors: [ColorObject],
      worstColors: [ColorObject]
    },
    styling: {
      patterns: [String],
      textures: [String],
      silhouettes: [String],
      accessories: [String],
      metals: [String]
    },
    makeup: Object,
    wardrobe: Object,
    shopping: Object
  },
  confidence: Number,
  processingTime: Number,
  createdAt: Date,
  updatedAt: Date,
  completedAt: Date
}
```

#### Payments Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  analysisId: ObjectId,
  stripePaymentIntentId: String,
  stripeCustomerId: String,
  amount: Number,
  currency: String,
  status: String, // pending, succeeded, failed, cancelled, refunded
  paymentMethod: String,
  description: String,
  metadata: Object,
  refundedAmount: Number,
  refundReason: String,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔧 Configuration

### Environment Variables

All configuration is managed through environment variables. See `env-template.md` for a complete list of required variables.

#### Critical Configuration
```bash
# Server
NODE_ENV=production
PORT=3000
API_VERSION=v1

# Database
MONGODB_URI=mongodb://localhost:27017/colorpro

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# Payments
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

# File Storage
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=colorpro-uploads

# Email
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@colorpro.com
```

### Security Best Practices

1. **Environment Variables**: Never commit sensitive data to version control
2. **HTTPS Only**: Always use SSL/TLS in production
3. **Rate Limiting**: Configured for 100 requests per 15-minute window
4. **CORS**: Restricted to allowed origins only
5. **File Upload**: Size limits and type validation
6. **SQL Injection**: MongoDB injection prevention with Mongoose
7. **XSS Protection**: Helmet.js security headers
8. **Authentication**: Firebase Auth + JWT with refresh tokens

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm run test:auth
npm run test:analysis
npm run test:payments

# Run e2e tests
npm run test:e2e
```

### Test Structure
```
tests/
├── unit/                # Unit tests for individual functions
├── integration/         # Integration tests for API endpoints
├── e2e/                # End-to-end tests
├── fixtures/           # Test data and mocks
└── helpers/            # Test utilities
```

## 📊 Monitoring & Logging

### Health Checks
```
GET /health              # Basic health check
GET /health/detailed     # Detailed system status
```

### Logging Levels
- **Error**: Critical errors requiring immediate attention
- **Warn**: Warning conditions that should be reviewed
- **Info**: General information about system operation
- **Debug**: Detailed information for development

### Log Structure
```json
{
  "timestamp": "2025-06-13T13:11:00.000Z",
  "level": "info",
  "message": "User action",
  "service": "colorpro-api",
  "userId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "action": "color_analysis_completed",
  "meta": {
    "analysisId": "60f7b3b3b3b3b3b3b3b3b3b4",
    "processingTime": "15000ms",
    "confidence": 0.89
  }
}
```

## 🚀 Deployment

### Production Deployment

1. **Build Docker Image**
```bash
docker build -t colorpro/backend:latest .
```

2. **Deploy with Docker Compose**
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

3. **Environment Setup**
```bash
# Set production environment variables
export NODE_ENV=production
export MONGODB_URI=mongodb+srv://...
export REDIS_URL=redis://...
```

### Cloud Deployment Options

#### AWS ECS
```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin
docker tag colorpro/backend:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/colorpro-backend:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/colorpro-backend:latest
```

#### Google Cloud Run
```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT-ID/colorpro-backend
gcloud run deploy --image gcr.io/PROJECT-ID/colorpro-backend --platform managed
```

#### Kubernetes
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/
```

### Database Migration

```bash
# Run database migrations
npm run migrate

# Seed initial data
npm run seed

# Backup database
npm run backup
```

## 📈 Performance & Scaling

### Performance Optimizations
- **Database Indexing**: Optimized indexes for common queries
- **Redis Caching**: Session and frequently accessed data caching
- **Image Optimization**: Sharp for automatic image compression
- **Connection Pooling**: MongoDB connection pool management
- **Lazy Loading**: On-demand loading of heavy resources

### Scaling Strategies
- **Horizontal Scaling**: Multiple API instances behind load balancer
- **Database Sharding**: User-based MongoDB sharding
- **CDN Integration**: AWS CloudFront for static assets
- **Microservices**: Separate services for analysis, payments, notifications

### Monitoring Metrics
- Response time percentiles (P50, P95, P99)
- Request rate and error rate
- Database connection pool usage
- Memory and CPU utilization
- File upload success/failure rates
- Payment processing metrics

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes with proper tests
4. Commit changes: `git commit -m 'Add amazing feature'`
5. Push to branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Code Standards
- **TypeScript**: Strict mode with comprehensive typing
- **ESLint**: Airbnb configuration with custom rules
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for linting and testing
- **Conventional Commits**: Structured commit messages

### Pull Request Process
1. Update documentation for any API changes
2. Add tests for new functionality
3. Ensure all tests pass
4. Update the changelog
5. Request review from maintainers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [API Documentation](docs/api.md)
- [Database Schema](docs/database.md)
- [Deployment Guide](docs/deployment.md)
- [Troubleshooting](docs/troubleshooting.md)

### Contact
- **Email**: dev@colorpro.com
- **Discord**: [ColorPro Developer Community](https://discord.gg/colorpro)
- **Issues**: [GitHub Issues](https://github.com/colorpro/backend/issues)

### Professional Services
For enterprise support, custom integration, or consulting services, contact our professional services team at enterprise@colorpro.com.

---

**ColorPro Backend** - Built with ❤️ by the ColorPro Team