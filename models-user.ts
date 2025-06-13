/**
 * User Model
 * MongoDB schema for user data with Mongoose ODM
 */

import mongoose, { Schema, Model } from 'mongoose';
import { IUser, IUserPreferences, IUserSubscription } from '@types/index';

// User Preferences Schema
const userPreferencesSchema = new Schema<IUserPreferences>({
  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    marketing: { type: Boolean, default: false },
  },
  theme: {
    type: String,
    enum: ['light', 'dark', 'system'],
    default: 'system',
  },
  colorSystem: {
    type: String,
    enum: ['seasonal', 'tonal', 'custom'],
    default: 'seasonal',
  },
  privacySettings: {
    profileVisibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'private',
    },
    analyticsOptOut: { type: Boolean, default: false },
  },
}, { _id: false });

// User Subscription Schema
const userSubscriptionSchema = new Schema<IUserSubscription>({
  type: {
    type: String,
    enum: ['color_analysis', 'personal_shopping', 'premium'],
    required: true,
  },
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold'],
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'cancelled', 'pending'],
    default: 'pending',
  },
  stripeCustomerId: String,
  stripeSubscriptionId: String,
  currentPeriodStart: { type: Date, required: true },
  currentPeriodEnd: { type: Date, required: true },
  cancelAtPeriodEnd: { type: Boolean, default: false },
  trialEnd: Date,
}, { _id: false });

// Main User Schema
const userSchema = new Schema<IUser>({
  firebaseUid: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  profileImage: {
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Profile image must be a valid URL',
    },
  },
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        return !v || /^\+?[1-9]\d{1,14}$/.test(v);
      },
      message: 'Phone number must be valid',
    },
  },
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(v: Date) {
        return !v || v < new Date();
      },
      message: 'Date of birth must be in the past',
    },
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say'],
  },
  language: {
    type: String,
    default: 'en',
    enum: ['en', 'es', 'pt'],
  },
  preferences: {
    type: userPreferencesSchema,
    default: () => ({}),
  },
  subscription: userSubscriptionSchema,
  lastLoginAt: Date,
  isActive: {
    type: Boolean,
    default: true,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
  collection: 'users',
});

// Indexes for performance
userSchema.index({ firebaseUid: 1 });
userSchema.index({ email: 1 });
userSchema.index({ 'subscription.status': 1 });
userSchema.index({ 'subscription.stripeCustomerId': 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLoginAt: -1 });

// Virtual for user age
userSchema.virtual('age').get(function(this: IUser) {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Virtual for subscription status
userSchema.virtual('subscriptionStatus').get(function(this: IUser) {
  if (!this.subscription) return 'none';
  return this.subscription.status;
});

// Instance methods
userSchema.methods.hasActiveSubscription = function(this: IUser): boolean {
  return this.subscription?.status === 'active' && 
         this.subscription.currentPeriodEnd > new Date();
};

userSchema.methods.canAccessFeature = function(this: IUser, feature: string): boolean {
  if (!this.hasActiveSubscription()) return false;
  
  const tier = this.subscription?.tier;
  const featureAccess: Record<string, string[]> = {
    bronze: ['basic_analysis'],
    silver: ['basic_analysis', 'style_recommendations'],
    gold: ['basic_analysis', 'style_recommendations', 'personal_shopping', 'priority_support'],
  };
  
  return tier ? featureAccess[tier]?.includes(feature) || false : false;
};

userSchema.methods.updateLastLogin = function(this: IUser): Promise<IUser> {
  this.lastLoginAt = new Date();
  return this.save();
};

// Static methods
userSchema.statics.findByFirebaseUid = function(firebaseUid: string) {
  return this.findOne({ firebaseUid });
};

userSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findActiveSubscriptions = function() {
  return this.find({
    'subscription.status': 'active',
    'subscription.currentPeriodEnd': { $gt: new Date() },
  });
};

userSchema.statics.findExpiringSubscriptions = function(days: number = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    'subscription.status': 'active',
    'subscription.currentPeriodEnd': { 
      $gte: new Date(),
      $lte: futureDate,
    },
    'subscription.cancelAtPeriodEnd': false,
  });
};

// Pre-save middleware
userSchema.pre('save', function(this: IUser, next) {
  // Ensure email is lowercase
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase();
  }
  
  // Set default preferences if not provided
  if (!this.preferences) {
    this.preferences = {
      notifications: { email: true, push: true, marketing: false },
      theme: 'system',
      colorSystem: 'seasonal',
      privacySettings: { profileVisibility: 'private', analyticsOptOut: false },
    };
  }
  
  next();
});

// Post-save middleware for logging
userSchema.post('save', function(this: IUser, doc, next) {
  console.log(`User ${doc.email} was saved`);
  next();
});

// Transform output
userSchema.set('toJSON', {
  transform: function(doc, ret) {
    delete ret.firebaseUid;
    delete ret.__v;
    return ret;
  },
});

// Create and export model
const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;