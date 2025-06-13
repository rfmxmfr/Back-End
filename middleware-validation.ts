/**
 * Validation Middleware
 * Request validation using Joi and express-validator
 */

import { Request, Response, NextFunction } from 'express';
import { checkSchema, Schema, validationResult } from 'express-validator';
import Joi from 'joi';
import { AppError, createValidationError } from './error.middleware';
import { IValidationError } from '@types/index';

/**
 * Validate with Joi
 * Validate request body, query, or params using Joi schema
 */
export const validateWithJoi = (
  schema: Joi.ObjectSchema,
  source: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = req[source];
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      errors: { label: 'key' },
    });

    if (error) {
      const errors: IValidationError[] = error.details.map((detail) => ({
        field: detail.context?.key?.toString() || detail.path.join('.'),
        message: detail.message.replace(/['"]/g, ''),
        value: detail.context?.value,
      }));

      return next(new AppError('Validation failed', 400, true, errors));
    }

    // Update req object with validated and sanitized data
    req[source] = value;
    next();
  };
};

/**
 * Validate with Express Validator
 * Validate request using express-validator schema
 */
export const validateWithExpressValidator = (validationSchema: Schema) => {
  return [
    checkSchema(validationSchema),
    (req: Request, res: Response, next: NextFunction) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const validationErrors: IValidationError[] = errors.array().map((error: any) => ({
          field: error.param,
          message: error.msg,
          value: error.value,
        }));

        return next(new AppError('Validation failed', 400, true, validationErrors));
      }
      next();
    },
  ];
};

/**
 * Auth Validation Schemas
 */
export const authSchemas = {
  // Login schema
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please enter a valid email address',
      'any.required': 'Email is required',
    }),
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters',
      'any.required': 'Password is required',
    }),
  }),

  // Registration schema
  register: Joi.object({
    name: Joi.string().trim().min(2).max(100).required().messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required',
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Please enter a valid email address',
      'any.required': 'Email is required',
    }),
    password: Joi.string().min(8).pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    ).required().messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required',
    }),
    passwordConfirm: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required',
    }),
  }),

  // Refresh token schema
  refreshToken: Joi.object({
    refreshToken: Joi.string().required().messages({
      'any.required': 'Refresh token is required',
    }),
  }),

  // Password reset request schema
  passwordResetRequest: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please enter a valid email address',
      'any.required': 'Email is required',
    }),
  }),

  // Password reset confirmation schema
  passwordReset: Joi.object({
    password: Joi.string().min(8).pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    ).required().messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required',
    }),
    passwordConfirm: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required',
    }),
    token: Joi.string().required().messages({
      'any.required': 'Reset token is required',
    }),
  }),
};

/**
 * User Validation Schemas
 */
export const userSchemas = {
  // Update profile schema
  updateProfile: Joi.object({
    name: Joi.string().trim().min(2).max(100).messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 100 characters',
    }),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).allow('').messages({
      'string.pattern.base': 'Please enter a valid phone number in international format',
    }),
    dateOfBirth: Joi.date().max('now').allow(null, '').messages({
      'date.max': 'Date of birth must be in the past',
    }),
    gender: Joi.string().valid('male', 'female', 'other', 'prefer-not-to-say').allow(null, ''),
    language: Joi.string().valid('en', 'es', 'pt'),
    preferences: Joi.object({
      notifications: Joi.object({
        email: Joi.boolean(),
        push: Joi.boolean(),
        marketing: Joi.boolean(),
      }),
      theme: Joi.string().valid('light', 'dark', 'system'),
      colorSystem: Joi.string().valid('seasonal', 'tonal', 'custom'),
      privacySettings: Joi.object({
        profileVisibility: Joi.string().valid('public', 'private'),
        analyticsOptOut: Joi.boolean(),
      }),
    }),
  }),

  // Change password schema
  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      'any.required': 'Current password is required',
    }),
    newPassword: Joi.string().min(8).pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    ).required().messages({
      'string.min': 'New password must be at least 8 characters',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'New password is required',
    }),
    newPasswordConfirm: Joi.string().valid(Joi.ref('newPassword')).required().messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required',
    }),
  }),

  // User ID schema for params
  userId: Joi.object({
    userId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid user ID format',
      'any.required': 'User ID is required',
    }),
  }),
};

/**
 * Color Analysis Validation Schemas
 */
export const analysisSchemas = {
  // Create analysis schema
  createAnalysis: Joi.object({
    analysisType: Joi.string()
      .valid('color_analysis', 'full_consultation', 'style_audit')
      .required()
      .messages({
        'any.only': 'Invalid analysis type',
        'any.required': 'Analysis type is required',
      }),
    personalData: Joi.object({
      age: Joi.number().integer().min(13).max(120).messages({
        'number.min': 'Age must be at least 13',
        'number.max': 'Age cannot exceed 120',
        'number.integer': 'Age must be an integer',
      }),
      skinTone: Joi.string()
        .valid('fair', 'medium', 'olive', 'dark', 'deep')
        .required()
        .messages({
          'any.only': 'Invalid skin tone',
          'any.required': 'Skin tone is required',
        }),
      eyeColor: Joi.string()
        .valid('blue', 'green', 'brown', 'hazel', 'gray', 'amber')
        .required()
        .messages({
          'any.only': 'Invalid eye color',
          'any.required': 'Eye color is required',
        }),
      hairColor: Joi.string()
        .valid('blonde', 'brown', 'black', 'red', 'gray', 'other')
        .required()
        .messages({
          'any.only': 'Invalid hair color',
          'any.required': 'Hair color is required',
        }),
      hairTexture: Joi.string()
        .valid('straight', 'wavy', 'curly', 'coily')
        .messages({
          'any.only': 'Invalid hair texture',
        }),
      lifestyle: Joi.string()
        .valid('professional', 'casual', 'creative', 'active', 'formal')
        .required()
        .messages({
          'any.only': 'Invalid lifestyle',
          'any.required': 'Lifestyle is required',
        }),
      styleGoals: Joi.array().items(Joi.string().max(100)).messages({
        'string.max': 'Style goal cannot exceed 100 characters',
      }),
      budget: Joi.string().valid('low', 'medium', 'high', 'luxury').messages({
        'any.only': 'Invalid budget',
      }),
      bodyType: Joi.string()
        .valid('pear', 'apple', 'hourglass', 'rectangle', 'inverted-triangle')
        .messages({
          'any.only': 'Invalid body type',
        }),
    }).required().messages({
      'any.required': 'Personal data is required',
    }),
  }),

  // Analysis ID schema for params
  analysisId: Joi.object({
    analysisId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid analysis ID format',
      'any.required': 'Analysis ID is required',
    }),
  }),

  // Analysis query schema
  analysisQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      'number.min': 'Page must be at least 1',
      'number.integer': 'Page must be an integer',
    }),
    limit: Joi.number().integer().min(1).max(50).default(10).messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 50',
      'number.integer': 'Limit must be an integer',
    }),
    status: Joi.string().valid('pending', 'processing', 'completed', 'failed').messages({
      'any.only': 'Invalid status',
    }),
    sort: Joi.string().valid('createdAt', 'updatedAt', 'completedAt', 'confidence').default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

/**
 * Payment Validation Schemas
 */
export const paymentSchemas = {
  // Create payment intent schema
  createPaymentIntent: Joi.object({
    amount: Joi.number().integer().min(1).required().messages({
      'number.min': 'Amount must be at least 1',
      'number.integer': 'Amount must be an integer',
      'any.required': 'Amount is required',
    }),
    currency: Joi.string().valid('usd', 'eur', 'gbp').default('eur').messages({
      'any.only': 'Invalid currency',
    }),
    description: Joi.string().max(500).required().messages({
      'string.max': 'Description cannot exceed 500 characters',
      'any.required': 'Description is required',
    }),
    analysisId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).messages({
      'string.pattern.base': 'Invalid analysis ID format',
    }),
    metadata: Joi.object(),
  }),

  // Subscription schema
  createSubscription: Joi.object({
    planId: Joi.string().required().messages({
      'any.required': 'Plan ID is required',
    }),
    paymentMethodId: Joi.string().required().messages({
      'any.required': 'Payment method ID is required',
    }),
  }),

  // Payment ID schema for params
  paymentId: Joi.object({
    paymentId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid payment ID format',
      'any.required': 'Payment ID is required',
    }),
  }),

  // Payment query schema
  paymentQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      'number.min': 'Page must be at least 1',
      'number.integer': 'Page must be an integer',
    }),
    limit: Joi.number().integer().min(1).max(50).default(10).messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 50',
      'number.integer': 'Limit must be an integer',
    }),
    status: Joi.string().valid('pending', 'succeeded', 'failed', 'cancelled', 'refunded').messages({
      'any.only': 'Invalid status',
    }),
    sort: Joi.string().valid('createdAt', 'amount').default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
    dateFrom: Joi.date(),
    dateTo: Joi.date().min(Joi.ref('dateFrom')).messages({
      'date.min': 'End date must be after start date',
    }),
  }),
};

/**
 * Common Validation Schemas
 */
export const commonSchemas = {
  // Pagination schema
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      'number.min': 'Page must be at least 1',
      'number.integer': 'Page must be an integer',
    }),
    limit: Joi.number().integer().min(1).max(50).default(10).messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 50',
      'number.integer': 'Limit must be an integer',
    }),
    sort: Joi.string(),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),

  // ID schema
  id: Joi.object({
    id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid ID format',
      'any.required': 'ID is required',
    }),
  }),

  // Language schema
  language: Joi.object({
    lang: Joi.string().valid('en', 'es', 'pt').default('en').messages({
      'any.only': 'Invalid language',
    }),
  }),
};

export default {
  validateWithJoi,
  validateWithExpressValidator,
  authSchemas,
  userSchemas,
  analysisSchemas,
  paymentSchemas,
  commonSchemas,
};