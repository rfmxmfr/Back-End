/**
 * TypeScript Type Definitions
 * Comprehensive type definitions for the ColorPro platform
 */

import { Request } from 'express';
import { Document, Types } from 'mongoose';

// =============================================
// USER TYPES
// =============================================

export interface IUser extends Document {
  _id: Types.ObjectId;
  firebaseUid: string;
  email: string;
  name: string;
  profileImage?: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  language: string;
  preferences: IUserPreferences;
  subscription?: IUserSubscription;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
  isEmailVerified: boolean;
}

export interface IUserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  colorSystem: 'seasonal' | 'tonal' | 'custom';
  privacySettings: {
    profileVisibility: 'public' | 'private';
    analyticsOptOut: boolean;
  };
}

export interface IUserSubscription {
  type: 'color_analysis' | 'personal_shopping' | 'premium';
  tier: 'bronze' | 'silver' | 'gold';
  status: 'active' | 'inactive' | 'cancelled' | 'pending';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
}

// =============================================
// COLOR ANALYSIS TYPES
// =============================================

export interface IColorAnalysis extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  sessionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  analysisType: 'color_analysis' | 'full_consultation' | 'style_audit';
  photos: IAnalysisPhoto[];
  personalData: IPersonalData;
  results?: IAnalysisResults;
  confidence?: number;
  processingTime?: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface IAnalysisPhoto {
  type: 'face_selfie' | 'full_body' | 'natural_light' | 'style_inspiration';
  url: string;
  s3Key: string;
  originalName: string;
  mimeType: string;
  size: number;
  metadata?: {
    width: number;
    height: number;
    colorSpace?: string;
    exif?: Record<string, any>;
  };
}

export interface IPersonalData {
  age?: number;
  skinTone: 'fair' | 'medium' | 'olive' | 'dark' | 'deep';
  eyeColor: 'blue' | 'green' | 'brown' | 'hazel' | 'gray' | 'amber';
  hairColor: 'blonde' | 'brown' | 'black' | 'red' | 'gray' | 'other';
  hairTexture?: 'straight' | 'wavy' | 'curly' | 'coily';
  lifestyle: 'professional' | 'casual' | 'creative' | 'active' | 'formal';
  styleGoals: string[];
  budget?: 'low' | 'medium' | 'high' | 'luxury';
  bodyType?: 'pear' | 'apple' | 'hourglass' | 'rectangle' | 'inverted-triangle';
}

export interface IAnalysisResults {
  season: ISeasonAnalysis;
  colorPalette: IColorPalette;
  styling: IStylingRecommendations;
  makeup?: IMakeupRecommendations;
  wardrobe?: IWardrobeRecommendations;
  shopping?: IShoppingRecommendations;
}

export interface ISeasonAnalysis {
  primary: 'spring' | 'summer' | 'autumn' | 'winter';
  secondary?: 'spring' | 'summer' | 'autumn' | 'winter';
  subtype: string;
  confidence: number;
  characteristics: string[];
  description: string;
}

export interface IColorPalette {
  primary: IColor[];
  neutral: IColor[];
  accent: IColor[];
  avoid: IColor[];
  bestColors: IColor[];
  worstColors: IColor[];
}

export interface IColor {
  hex: string;
  name: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  category: 'primary' | 'neutral' | 'accent' | 'avoid';
  weight?: number;
}

export interface IStylingRecommendations {
  patterns: string[];
  textures: string[];
  silhouettes: string[];
  accessories: string[];
  metals: ('gold' | 'silver' | 'rose-gold' | 'copper')[];
}

export interface IMakeupRecommendations {
  foundation: string[];
  lipstick: IColor[];
  eyeshadow: IColor[];
  blush: IColor[];
  eyeliner: IColor[];
  tips: string[];
}

export interface IWardrobeRecommendations {
  essentials: IWardrobeItem[];
  seasonal: IWardrobeItem[];
  professional: IWardrobeItem[];
  casual: IWardrobeItem[];
  formal: IWardrobeItem[];
}

export interface IWardrobeItem {
  category: string;
  item: string;
  colors: string[];
  priority: 'high' | 'medium' | 'low';
  notes?: string;
}

export interface IShoppingRecommendations {
  brands: IBrandRecommendation[];
  stores: IStoreRecommendation[];
  priceRanges: IPriceRange[];
  links: IProductLink[];
}

export interface IBrandRecommendation {
  name: string;
  category: string;
  priceRange: 'budget' | 'mid' | 'luxury';
  reasoning: string;
  website?: string;
}

export interface IStoreRecommendation {
  name: string;
  type: 'online' | 'physical' | 'both';
  speciality: string;
  website?: string;
}

export interface IPriceRange {
  category: string;
  budget: { min: number; max: number };
  mid: { min: number; max: number };
  luxury: { min: number; max: number };
}

export interface IProductLink {
  item: string;
  url: string;
  price?: number;
  brand: string;
  color?: string;
}

// =============================================
// PAYMENT TYPES
// =============================================

export interface IPayment extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  analysisId?: Types.ObjectId;
  stripePaymentIntentId: string;
  stripeCustomerId?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'refunded';
  paymentMethod: 'card' | 'bank_transfer' | 'digital_wallet';
  description: string;
  metadata?: Record<string, any>;
  refundedAmount?: number;
  refundReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISubscriptionPlan {
  id: string;
  name: string;
  type: 'color_analysis' | 'personal_shopping' | 'premium';
  tier: 'bronze' | 'silver' | 'gold';
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  limitations?: Record<string, number>;
  stripePriceId: string;
  isActive: boolean;
}

// =============================================
// API TYPES
// =============================================

export interface IApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface IAuthenticatedRequest extends Request {
  user?: IUser;
  userId?: string;
  firebaseUid?: string;
  language?: string;
}

export interface IPaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface IFilterQuery {
  search?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  [key: string]: any;
}

// =============================================
// FILE UPLOAD TYPES
// =============================================

export interface IFileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer?: Buffer;
  key?: string; // S3 key
  location?: string; // S3 URL
}

export interface IUploadResult {
  url: string;
  key: string;
  bucket: string;
  originalName: string;
  mimeType: string;
  size: number;
}

// =============================================
// EMAIL TYPES
// =============================================

export interface IEmailTemplate {
  subject: string;
  html: string;
  text?: string;
  attachments?: IEmailAttachment[];
}

export interface IEmailAttachment {
  filename: string;
  content?: Buffer;
  path?: string;
  contentType?: string;
}

export interface IEmailContext {
  user: {
    name: string;
    email: string;
  };
  analysis?: {
    id: string;
    season: string;
    colors: string[];
  };
  payment?: {
    amount: number;
    currency: string;
    description: string;
  };
  [key: string]: any;
}

// =============================================
// VALIDATION TYPES
// =============================================

export interface IValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ICustomError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
  errors?: IValidationError[];
}

// =============================================
// SERVICE TYPES
// =============================================

export interface IColorAnalysisService {
  analyzePhotos(photos: IAnalysisPhoto[], personalData: IPersonalData): Promise<IAnalysisResults>;
  generateReport(analysis: IColorAnalysis): Promise<Buffer>;
  getSeasonalPalette(season: string): IColorPalette;
}

export interface IEmailService {
  sendWelcomeEmail(user: IUser): Promise<void>;
  sendAnalysisComplete(user: IUser, analysis: IColorAnalysis): Promise<void>;
  sendPaymentConfirmation(user: IUser, payment: IPayment): Promise<void>;
  sendPasswordReset(user: IUser, resetToken: string): Promise<void>;
}

export interface IPaymentService {
  createPaymentIntent(amount: number, currency: string, metadata?: Record<string, any>): Promise<any>;
  createSubscription(customerId: string, priceId: string): Promise<any>;
  cancelSubscription(subscriptionId: string): Promise<any>;
  processWebhook(payload: string, signature: string): Promise<any>;
}

// =============================================
// CONFIGURATION TYPES
// =============================================

export interface IConfig {
  nodeEnv: string;
  port: number;
  apiVersion: string;
  corsOrigin: string;
  mongodbUri: string;
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  firebase: {
    projectId: string;
    privateKey: string;
    clientEmail: string;
  };
  stripe: {
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
  };
  aws: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    s3Bucket: string;
  };
  sendGrid: {
    apiKey: string;
    fromEmail: string;
    fromName: string;
  };
}

export default {
  IUser,
  IColorAnalysis,
  IPayment,
  IApiResponse,
  IAuthenticatedRequest,
  IFileUpload,
  IEmailTemplate,
  IConfig,
};