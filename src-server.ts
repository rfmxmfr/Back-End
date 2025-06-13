/**
 * ColorPro Backend Server
 * Professional Color Analysis Platform API
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';
import { config } from './utils/config';
import { connectDatabase } from './utils/database';
import { logger } from './utils/logger';
import { errorHandler, notFound } from './middleware/error.middleware';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import analysisRoutes from './routes/analysis.routes';
import paymentRoutes from './routes/payment.routes';

class Server {
  public app: Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = config.port;
    this.initializeI18n();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private async initializeI18n(): Promise<void> {
    await i18next
      .use(Backend)
      .use(middleware.LanguageDetector)
      .init({
        fallbackLng: config.defaultLanguage,
        supportedLngs: config.supportedLanguages,
        backend: {
          loadPath: './locales/{{lng}}/translation.json',
        },
        detection: {
          order: ['header', 'querystring'],
          caches: false,
        },
        interpolation: {
          escapeValue: false,
        },
      });
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.corsOrigin.split(','),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimitWindowMs,
      max: config.rateLimitMaxRequests,
      message: {
        error: 'Too many requests from this IP, please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api', limiter);

    // General middleware
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Logging
    if (config.nodeEnv !== 'test') {
      this.app.use(morgan('combined', {
        stream: {
          write: (message: string) => {
            logger.info(message.trim());
          },
        },
      }));
    }

    // Internationalization
    this.app.use(middleware.handle(i18next));

    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'success',
        message: 'ColorPro API is running',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
        version: process.env.npm_package_version || '1.0.0',
      });
    });
  }

  private initializeRoutes(): void {
    const apiRouter = express.Router();

    // API Routes
    apiRouter.use('/auth', authRoutes);
    apiRouter.use('/users', userRoutes);
    apiRouter.use('/analysis', analysisRoutes);
    apiRouter.use('/payments', paymentRoutes);

    // Mount API routes
    this.app.use(`/api/${config.apiVersion}`, apiRouter);

    // API documentation route
    this.app.get('/api', (req: Request, res: Response) => {
      res.json({
        name: 'ColorPro API',
        version: config.apiVersion,
        description: 'Professional Color Analysis Platform Backend API',
        endpoints: {
          health: '/health',
          auth: `/api/${config.apiVersion}/auth`,
          users: `/api/${config.apiVersion}/users`,
          analysis: `/api/${config.apiVersion}/analysis`,
          payments: `/api/${config.apiVersion}/payments`,
        },
        documentation: 'https://docs.colorpro.com',
      });
    });
  }

  private initializeErrorHandling(): void {
    // Handle 404 routes
    this.app.use(notFound);

    // Global error handler
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await connectDatabase();

      // Start server
      this.app.listen(this.port, () => {
        logger.info(`🚀 ColorPro Server running on port ${this.port}`);
        logger.info(`📄 Environment: ${config.nodeEnv}`);
        logger.info(`🌐 API Documentation: http://localhost:${this.port}/api`);
        logger.info(`❤️  Health Check: http://localhost:${this.port}/health`);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  public getApp(): Application {
    return this.app;
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Create and start server
const server = new Server();

if (require.main === module) {
  server.start();
}

export default server;