# Environment Configuration Template
# Copy this file to .env and fill in your actual values

# =============================================
# SERVER CONFIGURATION
# =============================================
NODE_ENV=development
PORT=3000
API_VERSION=v1
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# =============================================
# DATABASE CONFIGURATION
# =============================================
MONGODB_URI=mongodb://localhost:27017/colorpro
MONGODB_TEST_URI=mongodb://localhost:27017/colorpro_test

# =============================================
# FIREBASE CONFIGURATION
# =============================================
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token

# =============================================
# JWT CONFIGURATION
# =============================================
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-token-secret
JWT_REFRESH_EXPIRES_IN=30d

# =============================================
# STRIPE CONFIGURATION
# =============================================
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
STRIPE_ENDPOINT_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

# =============================================
# AWS S3 CONFIGURATION
# =============================================
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=colorpro-uploads
AWS_S3_BUCKET_URL=https://colorpro-uploads.s3.amazonaws.com

# =============================================
# SENDGRID EMAIL CONFIGURATION
# =============================================
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@colorpro.com
FROM_NAME=ColorPro Team
SUPPORT_EMAIL=support@colorpro.com

# =============================================
# REDIS CONFIGURATION (Optional - for caching)
# =============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# =============================================
# RATE LIMITING
# =============================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# =============================================
# FILE UPLOAD LIMITS
# =============================================
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp

# =============================================
# COLOR ANALYSIS CONFIGURATION
# =============================================
AI_MODEL_PATH=./models/color-analysis-model
CONFIDENCE_THRESHOLD=0.8
MAX_ANALYSIS_TIME=30000

# =============================================
# INTERNATIONALIZATION
# =============================================
DEFAULT_LANGUAGE=en
SUPPORTED_LANGUAGES=en,es,pt

# =============================================
# LOGGING
# =============================================
LOG_LEVEL=info
LOG_FILE=logs/colorpro.log

# =============================================
# SECURITY
# =============================================
BCRYPT_SALT_ROUNDS=12
SESSION_SECRET=your-session-secret-key

# =============================================
# EXTERNAL APIs (Optional)
# =============================================
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx
GOOGLE_CLOUD_API_KEY=your-google-cloud-api-key