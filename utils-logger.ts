/**
 * Logging Utility
 * Winston-based logging with multiple transports
 */

import winston from 'winston';
import path from 'path';
import { config } from './config';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Logger configuration
const loggerConfig: winston.LoggerOptions = {
  level: config.logLevel,
  format: logFormat,
  defaultMeta: { service: 'colorpro-api' },
  transports: [],
  exceptionHandlers: [],
  rejectionHandlers: [],
};

// Add console transport for development
if (config.isDevelopment || config.isTest) {
  loggerConfig.transports!.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: config.isTest ? 'error' : 'debug',
    })
  );
}

// Add file transports for production
if (config.isProduction) {
  loggerConfig.transports!.push(
    // Error logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Exception and rejection handlers for production
  loggerConfig.exceptionHandlers!.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
    })
  );

  loggerConfig.rejectionHandlers!.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
    })
  );
}

// Create logger instance
export const logger = winston.createLogger(loggerConfig);

// Stream for Morgan HTTP logging
export const morganStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// Helper functions for structured logging
export const logError = (message: string, error: Error, meta?: object) => {
  logger.error(message, {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...meta,
  });
};

export const logRequest = (
  method: string,
  url: string,
  statusCode: number,
  responseTime?: number,
  meta?: object
) => {
  logger.info('HTTP Request', {
    method,
    url,
    statusCode,
    responseTime: responseTime ? `${responseTime}ms` : undefined,
    ...meta,
  });
};

export const logUserAction = (
  userId: string,
  action: string,
  resource?: string,
  meta?: object
) => {
  logger.info('User Action', {
    userId,
    action,
    resource,
    timestamp: new Date().toISOString(),
    ...meta,
  });
};

export const logPaymentEvent = (
  event: string,
  amount?: number,
  currency?: string,
  meta?: object
) => {
  logger.info('Payment Event', {
    event,
    amount,
    currency,
    timestamp: new Date().toISOString(),
    ...meta,
  });
};

export const logAnalysisEvent = (
  analysisId: string,
  event: string,
  meta?: object
) => {
  logger.info('Analysis Event', {
    analysisId,
    event,
    timestamp: new Date().toISOString(),
    ...meta,
  });
};

// Performance monitoring
export const createPerformanceTimer = (label: string) => {
  const startTime = Date.now();
  
  return {
    end: (meta?: object) => {
      const duration = Date.now() - startTime;
      logger.debug('Performance', {
        label,
        duration: `${duration}ms`,
        ...meta,
      });
      return duration;
    },
  };
};

// Security logging
export const logSecurityEvent = (
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  meta?: object
) => {
  logger.warn('Security Event', {
    event,
    severity,
    timestamp: new Date().toISOString(),
    ...meta,
  });
};

// API rate limiting logging
export const logRateLimit = (ip: string, endpoint: string, meta?: object) => {
  logger.warn('Rate Limit Exceeded', {
    ip,
    endpoint,
    timestamp: new Date().toISOString(),
    ...meta,
  });
};

export default logger;