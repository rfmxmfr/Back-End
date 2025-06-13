/**
 * Error Handling Middleware
 * Centralized error handling for the ColorPro API
 */

import { Request, Response, NextFunction } from 'express';
import { MongoError } from 'mongodb';
import { Error as MongooseError } from 'mongoose';
import { MulterError } from 'multer';
import jwt from 'jsonwebtoken';
import { logger, logError } from '@utils/logger';
import { ICustomError, IValidationError } from '@types/index';

/**
 * Custom Error Class
 */
export class AppError extends Error implements ICustomError {
  public statusCode: number;
  public status: string;
  public isOperational: boolean;
  public errors?: IValidationError[];

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    errors?: IValidationError[]
  ) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
    this.isOperational = isOperational;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async Error Handler Wrapper
 * Wraps async route handlers to catch errors automatically
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle Cast Errors (Invalid MongoDB ObjectId)
 */
const handleCastError = (error: any): AppError => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return new AppError(message, 400);
};

/**
 * Handle Duplicate Key Errors (MongoDB E11000)
 */
const handleDuplicateKeyError = (error: MongoError): AppError => {
  const field = Object.keys((error as any).keyValue)[0];
  const value = (error as any).keyValue[field];
  const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`;
  return new AppError(message, 400);
};

/**
 * Handle Mongoose Validation Errors
 */
const handleValidationError = (error: MongooseError.ValidationError): AppError => {
  const errors: IValidationError[] = Object.values(error.errors).map((err: any) => ({
    field: err.path,
    message: err.message,
    value: err.value,
  }));

  const message = 'Validation failed';
  return new AppError(message, 400, true, errors);
};

/**
 * Handle JWT Errors
 */
const handleJWTError = (): AppError => {
  return new AppError('Invalid token. Please log in again.', 401);
};

const handleJWTExpiredError = (): AppError => {
  return new AppError('Token expired. Please log in again.', 401);
};

/**
 * Handle Multer File Upload Errors
 */
const handleMulterError = (error: MulterError): AppError => {
  let message = 'File upload error';
  let statusCode = 400;

  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      message = 'File too large';
      break;
    case 'LIMIT_FILE_COUNT':
      message = 'Too many files';
      break;
    case 'LIMIT_FIELD_KEY':
      message = 'Field name too long';
      break;
    case 'LIMIT_FIELD_VALUE':
      message = 'Field value too long';
      break;
    case 'LIMIT_FIELD_COUNT':
      message = 'Too many fields';
      break;
    case 'LIMIT_UNEXPECTED_FILE':
      message = 'Unexpected file field';
      break;
    case 'LIMIT_PART_COUNT':
      message = 'Too many parts';
      break;
  }

  return new AppError(message, statusCode);
};

/**
 * Handle Stripe Errors
 */
const handleStripeError = (error: any): AppError => {
  let message = 'Payment processing error';
  let statusCode = 400;

  switch (error.type) {
    case 'StripeCardError':
      message = error.message || 'Your card was declined';
      break;
    case 'StripeRateLimitError':
      message = 'Too many requests made to the API too quickly';
      statusCode = 429;
      break;
    case 'StripeInvalidRequestError':
      message = 'Invalid parameters were supplied to Stripe';
      break;
    case 'StripeAPIError':
      message = 'An error occurred internally with Stripe';
      statusCode = 500;
      break;
    case 'StripeConnectionError':
      message = 'Network communication with Stripe failed';
      statusCode = 503;
      break;
    case 'StripeAuthenticationError':
      message = 'Authentication with Stripe failed';
      statusCode = 401;
      break;
  }

  return new AppError(message, statusCode);
};

/**
 * Send Error Response for Development
 */
const sendErrorDev = (err: ICustomError, res: Response): void => {
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      status: err.status,
      message: err.message,
      stack: err.stack,
      errors: err.errors,
    },
  });
};

/**
 * Send Error Response for Production
 */
const sendErrorProd = (err: ICustomError, res: Response): void => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR:', err);

    res.status(500).json({
      success: false,
      message: 'Something went wrong!',
    });
  }
};

/**
 * Global Error Handler Middleware
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logError('API Error', err, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Handle specific error types
  if (err.name === 'CastError') {
    error = handleCastError(error);
  }

  if (err.code === 11000) {
    error = handleDuplicateKeyError(error);
  }

  if (err.name === 'ValidationError') {
    error = handleValidationError(error);
  }

  if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  }

  if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  }

  if (err instanceof MulterError) {
    error = handleMulterError(err);
  }

  if (err.type && err.type.includes('Stripe')) {
    error = handleStripeError(err);
  }

  // Send error response
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

/**
 * 404 Not Found Handler
 */
export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const message = `Route ${req.originalUrl} not found`;
  const error = new AppError(message, 404);
  next(error);
};

/**
 * Validation Error Helper
 */
export const createValidationError = (
  field: string,
  message: string,
  value?: any
): IValidationError => {
  return { field, message, value };
};

/**
 * Common Error Responses
 */
export const ErrorResponses = {
  UNAUTHORIZED: new AppError('Authentication required', 401),
  FORBIDDEN: new AppError('Access denied', 403),
  NOT_FOUND: new AppError('Resource not found', 404),
  CONFLICT: new AppError('Resource already exists', 409),
  VALIDATION_FAILED: new AppError('Validation failed', 400),
  INTERNAL_ERROR: new AppError('Internal server error', 500),
  SERVICE_UNAVAILABLE: new AppError('Service temporarily unavailable', 503),
  
  // Analysis specific errors
  ANALYSIS_NOT_FOUND: new AppError('Color analysis not found', 404),
  ANALYSIS_PROCESSING: new AppError('Analysis is currently being processed', 409),
  INSUFFICIENT_PHOTOS: new AppError('At least one photo is required for analysis', 400),
  INVALID_PHOTO_TYPE: new AppError('Invalid photo type for analysis', 400),
  
  // Payment specific errors
  PAYMENT_FAILED: new AppError('Payment processing failed', 400),
  INVALID_SUBSCRIPTION: new AppError('Invalid or expired subscription', 400),
  SUBSCRIPTION_REQUIRED: new AppError('Active subscription required', 403),
  
  // User specific errors
  USER_NOT_FOUND: new AppError('User not found', 404),
  EMAIL_ALREADY_EXISTS: new AppError('Email address already registered', 409),
  INVALID_CREDENTIALS: new AppError('Invalid email or password', 401),
  ACCOUNT_DISABLED: new AppError('Account is disabled', 403),
  EMAIL_NOT_VERIFIED: new AppError('Email address not verified', 403),
};

/**
 * Rate Limit Error Handler
 */
export const rateLimitHandler = (req: Request, res: Response): void => {
  res.status(429).json({
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((req.rateLimit?.resetTime || Date.now()) / 1000),
  });
};

/**
 * CORS Error Handler
 */
export const corsErrorHandler = (req: Request, res: Response): void => {
  res.status(403).json({
    success: false,
    message: 'Not allowed by CORS policy',
  });
};

/**
 * Request Timeout Handler
 */
export const timeoutHandler = (req: Request, res: Response): void => {
  res.status(408).json({
    success: false,
    message: 'Request timeout',
  });
};

/**
 * Server Error Logger
 */
export const logServerError = (error: Error, context?: object): void => {
  logger.error('Server Error', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...context,
  });
};

export default {
  AppError,
  asyncHandler,
  errorHandler,
  notFound,
  createValidationError,
  ErrorResponses,
  rateLimitHandler,
  corsErrorHandler,
  timeoutHandler,
  logServerError,
};