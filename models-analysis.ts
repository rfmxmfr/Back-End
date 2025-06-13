/**
 * Color Analysis Model
 * MongoDB schema for color analysis data and results
 */

import mongoose, { Schema, Model } from 'mongoose';
import { 
  IColorAnalysis, 
  IAnalysisPhoto, 
  IPersonalData, 
  IAnalysisResults,
  ISeasonAnalysis,
  IColorPalette,
  IColor,
  IStylingRecommendations,
  IMakeupRecommendations,
  IWardrobeRecommendations
} from '@types/index';

// Color Schema
const colorSchema = new Schema<IColor>({
  hex: {
    type: String,
    required: true,
    validate: {
      validator: (v: string) => /^#[0-9A-F]{6}$/i.test(v),
      message: 'Invalid hex color format',
    },
  },
  name: { type: String, required: true },
  rgb: {
    r: { type: Number, min: 0, max: 255, required: true },
    g: { type: Number, min: 0, max: 255, required: true },
    b: { type: Number, min: 0, max: 255, required: true },
  },
  hsl: {
    h: { type: Number, min: 0, max: 360, required: true },
    s: { type: Number, min: 0, max: 100, required: true },
    l: { type: Number, min: 0, max: 100, required: true },
  },
  category: {
    type: String,
    enum: ['primary', 'neutral', 'accent', 'avoid'],
    required: true,
  },
  weight: { type: Number, min: 0, max: 1 },
}, { _id: false });

// Analysis Photo Schema
const analysisPhotoSchema = new Schema<IAnalysisPhoto>({
  type: {
    type: String,
    enum: ['face_selfie', 'full_body', 'natural_light', 'style_inspiration'],
    required: true,
  },
  url: { type: String, required: true },
  s3Key: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: {
    type: String,
    required: true,
    validate: {
      validator: (v: string) => ['image/jpeg', 'image/png', 'image/webp'].includes(v),
      message: 'Invalid image type',
    },
  },
  size: { type: Number, required: true, max: 10485760 }, // 10MB limit
  metadata: {
    width: Number,
    height: Number,
    colorSpace: String,
    exif: Schema.Types.Mixed,
  },
}, { _id: false });

// Personal Data Schema
const personalDataSchema = new Schema<IPersonalData>({
  age: { type: Number, min: 13, max: 120 },
  skinTone: {
    type: String,
    enum: ['fair', 'medium', 'olive', 'dark', 'deep'],
    required: true,
  },
  eyeColor: {
    type: String,
    enum: ['blue', 'green', 'brown', 'hazel', 'gray', 'amber'],
    required: true,
  },
  hairColor: {
    type: String,
    enum: ['blonde', 'brown', 'black', 'red', 'gray', 'other'],
    required: true,
  },
  hairTexture: {
    type: String,
    enum: ['straight', 'wavy', 'curly', 'coily'],
  },
  lifestyle: {
    type: String,
    enum: ['professional', 'casual', 'creative', 'active', 'formal'],
    required: true,
  },
  styleGoals: [{ type: String, maxlength: 100 }],
  budget: {
    type: String,
    enum: ['low', 'medium', 'high', 'luxury'],
  },
  bodyType: {
    type: String,
    enum: ['pear', 'apple', 'hourglass', 'rectangle', 'inverted-triangle'],
  },
}, { _id: false });

// Season Analysis Schema
const seasonAnalysisSchema = new Schema<ISeasonAnalysis>({
  primary: {
    type: String,
    enum: ['spring', 'summer', 'autumn', 'winter'],
    required: true,
  },
  secondary: {
    type: String,
    enum: ['spring', 'summer', 'autumn', 'winter'],
  },
  subtype: { type: String, required: true },
  confidence: { type: Number, min: 0, max: 1, required: true },
  characteristics: [{ type: String }],
  description: { type: String, required: true },
}, { _id: false });

// Color Palette Schema
const colorPaletteSchema = new Schema<IColorPalette>({
  primary: [colorSchema],
  neutral: [colorSchema],
  accent: [colorSchema],
  avoid: [colorSchema],
  bestColors: [colorSchema],
  worstColors: [colorSchema],
}, { _id: false });

// Styling Recommendations Schema
const stylingRecommendationsSchema = new Schema<IStylingRecommendations>({
  patterns: [{ type: String }],
  textures: [{ type: String }],
  silhouettes: [{ type: String }],
  accessories: [{ type: String }],
  metals: [{
    type: String,
    enum: ['gold', 'silver', 'rose-gold', 'copper'],
  }],
}, { _id: false });

// Makeup Recommendations Schema
const makeupRecommendationsSchema = new Schema<IMakeupRecommendations>({
  foundation: [{ type: String }],
  lipstick: [colorSchema],
  eyeshadow: [colorSchema],
  blush: [colorSchema],
  eyeliner: [colorSchema],
  tips: [{ type: String }],
}, { _id: false });

// Wardrobe Item Schema
const wardrobeItemSchema = new Schema({
  category: { type: String, required: true },
  item: { type: String, required: true },
  colors: [{ type: String }],
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    required: true,
  },
  notes: String,
}, { _id: false });

// Wardrobe Recommendations Schema
const wardrobeRecommendationsSchema = new Schema<IWardrobeRecommendations>({
  essentials: [wardrobeItemSchema],
  seasonal: [wardrobeItemSchema],
  professional: [wardrobeItemSchema],
  casual: [wardrobeItemSchema],
  formal: [wardrobeItemSchema],
}, { _id: false });

// Analysis Results Schema
const analysisResultsSchema = new Schema<IAnalysisResults>({
  season: { type: seasonAnalysisSchema, required: true },
  colorPalette: { type: colorPaletteSchema, required: true },
  styling: { type: stylingRecommendationsSchema, required: true },
  makeup: makeupRecommendationsSchema,
  wardrobe: wardrobeRecommendationsSchema,
  shopping: {
    brands: [{
      name: String,
      category: String,
      priceRange: { type: String, enum: ['budget', 'mid', 'luxury'] },
      reasoning: String,
      website: String,
    }],
    stores: [{
      name: String,
      type: { type: String, enum: ['online', 'physical', 'both'] },
      speciality: String,
      website: String,
    }],
    priceRanges: [{
      category: String,
      budget: { min: Number, max: Number },
      mid: { min: Number, max: Number },
      luxury: { min: Number, max: Number },
    }],
    links: [{
      item: String,
      url: String,
      price: Number,
      brand: String,
      color: String,
    }],
  },
}, { _id: false });

// Main Color Analysis Schema
const colorAnalysisSchema = new Schema<IColorAnalysis>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true,
  },
  analysisType: {
    type: String,
    enum: ['color_analysis', 'full_consultation', 'style_audit'],
    required: true,
  },
  photos: [analysisPhotoSchema],
  personalData: { type: personalDataSchema, required: true },
  results: analysisResultsSchema,
  confidence: { type: Number, min: 0, max: 1 },
  processingTime: { type: Number }, // in milliseconds
  completedAt: Date,
}, {
  timestamps: true,
  collection: 'color_analyses',
});

// Indexes for performance
colorAnalysisSchema.index({ userId: 1, createdAt: -1 });
colorAnalysisSchema.index({ sessionId: 1 });
colorAnalysisSchema.index({ status: 1 });
colorAnalysisSchema.index({ analysisType: 1 });
colorAnalysisSchema.index({ 'results.season.primary': 1 });

// Virtual for analysis duration
colorAnalysisSchema.virtual('duration').get(function(this: IColorAnalysis) {
  if (!this.completedAt) return null;
  return this.completedAt.getTime() - this.createdAt.getTime();
});

// Instance methods
colorAnalysisSchema.methods.markAsProcessing = function(this: IColorAnalysis) {
  this.status = 'processing';
  return this.save();
};

colorAnalysisSchema.methods.markAsCompleted = function(
  this: IColorAnalysis, 
  results: IAnalysisResults, 
  confidence: number,
  processingTime?: number
) {
  this.status = 'completed';
  this.results = results;
  this.confidence = confidence;
  this.completedAt = new Date();
  if (processingTime) this.processingTime = processingTime;
  return this.save();
};

colorAnalysisSchema.methods.markAsFailed = function(this: IColorAnalysis) {
  this.status = 'failed';
  return this.save();
};

colorAnalysisSchema.methods.getMainColors = function(this: IColorAnalysis): IColor[] {
  if (!this.results) return [];
  return [
    ...this.results.colorPalette.primary,
    ...this.results.colorPalette.accent,
  ].slice(0, 5);
};

// Static methods
colorAnalysisSchema.statics.findByUserId = function(userId: string) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

colorAnalysisSchema.statics.findBySessionId = function(sessionId: string) {
  return this.findOne({ sessionId });
};

colorAnalysisSchema.statics.findCompleted = function() {
  return this.find({ status: 'completed' }).populate('userId', 'name email');
};

colorAnalysisSchema.statics.getAnalysisStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgConfidence: { $avg: '$confidence' },
        avgProcessingTime: { $avg: '$processingTime' },
      },
    },
  ]);
};

colorAnalysisSchema.statics.getSeasonDistribution = function() {
  return this.aggregate([
    { $match: { status: 'completed' } },
    {
      $group: {
        _id: '$results.season.primary',
        count: { $sum: 1 },
        avgConfidence: { $avg: '$results.season.confidence' },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

// Pre-save middleware
colorAnalysisSchema.pre('save', function(this: IColorAnalysis, next) {
  // Generate session ID if not provided
  if (!this.sessionId) {
    this.sessionId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Validate photos array
  if (this.photos.length === 0) {
    return next(new Error('At least one photo is required'));
  }
  
  next();
});

// Transform output
colorAnalysisSchema.set('toJSON', {
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  },
});

// Create and export model
const ColorAnalysis: Model<IColorAnalysis> = mongoose.model<IColorAnalysis>('ColorAnalysis', colorAnalysisSchema);

export default ColorAnalysis;