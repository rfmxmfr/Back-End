/**
 * Payment Model
 * MongoDB schema for payment transactions and subscriptions
 */

import mongoose, { Schema, Model } from 'mongoose';
import { IPayment } from '@types/index';

// Payment Schema
const paymentSchema = new Schema<IPayment>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  analysisId: {
    type: Schema.Types.ObjectId,
    ref: 'ColorAnalysis',
    index: true,
  },
  stripePaymentIntentId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  stripeCustomerId: {
    type: String,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    required: true,
    uppercase: true,
    minlength: 3,
    maxlength: 3,
    default: 'EUR',
  },
  status: {
    type: String,
    enum: ['pending', 'succeeded', 'failed', 'cancelled', 'refunded'],
    default: 'pending',
    index: true,
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'bank_transfer', 'digital_wallet'],
    default: 'card',
  },
  description: {
    type: String,
    required: true,
    maxlength: 500,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
  refundedAmount: {
    type: Number,
    min: 0,
    default: 0,
  },
  refundReason: {
    type: String,
    maxlength: 500,
  },
}, {
  timestamps: true,
  collection: 'payments',
});

// Indexes for performance and queries
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ stripePaymentIntentId: 1 });
paymentSchema.index({ stripeCustomerId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ amount: 1 });
paymentSchema.index({ currency: 1 });
paymentSchema.index({ createdAt: -1 });

// Compound indexes
paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });

// Virtual for payment amount in dollars/euros
paymentSchema.virtual('formattedAmount').get(function(this: IPayment) {
  return (this.amount / 100).toFixed(2);
});

// Virtual for refunded status
paymentSchema.virtual('isRefunded').get(function(this: IPayment) {
  return this.status === 'refunded' || this.refundedAmount > 0;
});

// Virtual for partial refund
paymentSchema.virtual('isPartiallyRefunded').get(function(this: IPayment) {
  return this.refundedAmount > 0 && this.refundedAmount < this.amount;
});

// Virtual for net amount (after refunds)
paymentSchema.virtual('netAmount').get(function(this: IPayment) {
  return this.amount - (this.refundedAmount || 0);
});

// Instance methods
paymentSchema.methods.markAsSucceeded = function(this: IPayment) {
  this.status = 'succeeded';
  return this.save();
};

paymentSchema.methods.markAsFailed = function(this: IPayment, reason?: string) {
  this.status = 'failed';
  if (reason) {
    this.metadata = { ...this.metadata, failureReason: reason };
  }
  return this.save();
};

paymentSchema.methods.markAsCancelled = function(this: IPayment) {
  this.status = 'cancelled';
  return this.save();
};

paymentSchema.methods.processRefund = function(
  this: IPayment, 
  amount: number, 
  reason?: string
) {
  if (amount > this.amount) {
    throw new Error('Refund amount cannot exceed payment amount');
  }
  
  this.refundedAmount = (this.refundedAmount || 0) + amount;
  
  if (this.refundedAmount >= this.amount) {
    this.status = 'refunded';
  }
  
  if (reason) {
    this.refundReason = reason;
  }
  
  return this.save();
};

paymentSchema.methods.canBeRefunded = function(this: IPayment): boolean {
  return this.status === 'succeeded' && 
         (this.refundedAmount || 0) < this.amount;
};

paymentSchema.methods.getRemainingRefundableAmount = function(this: IPayment): number {
  if (!this.canBeRefunded()) return 0;
  return this.amount - (this.refundedAmount || 0);
};

// Static methods
paymentSchema.statics.findByUserId = function(userId: string) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

paymentSchema.statics.findByStripePaymentIntentId = function(paymentIntentId: string) {
  return this.findOne({ stripePaymentIntentId: paymentIntentId });
};

paymentSchema.statics.findSuccessfulPayments = function(userId?: string) {
  const query: any = { status: 'succeeded' };
  if (userId) query.userId = userId;
  return this.find(query).sort({ createdAt: -1 });
};

paymentSchema.statics.getTotalRevenue = function(startDate?: Date, endDate?: Date) {
  const matchQuery: any = { status: 'succeeded' };
  
  if (startDate || endDate) {
    matchQuery.createdAt = {};
    if (startDate) matchQuery.createdAt.$gte = startDate;
    if (endDate) matchQuery.createdAt.$lte = endDate;
  }
  
  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: { $subtract: ['$amount', { $ifNull: ['$refundedAmount', 0] }] } },
        totalPayments: { $sum: 1 },
        averageAmount: { $avg: '$amount' },
      },
    },
  ]);
};

paymentSchema.statics.getRevenueByPeriod = function(
  period: 'day' | 'week' | 'month' | 'year' = 'month',
  startDate?: Date,
  endDate?: Date
) {
  const matchQuery: any = { status: 'succeeded' };
  
  if (startDate || endDate) {
    matchQuery.createdAt = {};
    if (startDate) matchQuery.createdAt.$gte = startDate;
    if (endDate) matchQuery.createdAt.$lte = endDate;
  }
  
  const dateFormat: Record<string, any> = {
    day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
    week: { $dateToString: { format: '%Y-W%U', date: '$createdAt' } },
    month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
    year: { $dateToString: { format: '%Y', date: '$createdAt' } },
  };
  
  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: dateFormat[period],
        revenue: { $sum: { $subtract: ['$amount', { $ifNull: ['$refundedAmount', 0] }] } },
        count: { $sum: 1 },
        averageAmount: { $avg: '$amount' },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

paymentSchema.statics.getPaymentMethodStats = function() {
  return this.aggregate([
    { $match: { status: 'succeeded' } },
    {
      $group: {
        _id: '$paymentMethod',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        averageAmount: { $avg: '$amount' },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

paymentSchema.statics.getFailedPaymentReasons = function() {
  return this.aggregate([
    { $match: { status: 'failed' } },
    {
      $group: {
        _id: '$metadata.failureReason',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

paymentSchema.statics.findPendingPayments = function(olderThanMinutes: number = 30) {
  const cutoffDate = new Date(Date.now() - olderThanMinutes * 60 * 1000);
  return this.find({
    status: 'pending',
    createdAt: { $lt: cutoffDate },
  });
};

// Pre-save middleware
paymentSchema.pre('save', function(this: IPayment, next) {
  // Ensure currency is uppercase
  if (this.isModified('currency')) {
    this.currency = this.currency.toUpperCase();
  }
  
  // Validate refund amount
  if (this.refundedAmount && this.refundedAmount > this.amount) {
    return next(new Error('Refunded amount cannot exceed payment amount'));
  }
  
  next();
});

// Post-save middleware for logging
paymentSchema.post('save', function(this: IPayment) {
  console.log(`Payment ${this.stripePaymentIntentId} status: ${this.status}`);
});

// Transform output
paymentSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.formattedAmount = doc.formattedAmount;
    ret.isRefunded = doc.isRefunded;
    ret.netAmount = doc.netAmount;
    delete ret.__v;
    return ret;
  },
});

// Create and export model
const Payment: Model<IPayment> = mongoose.model<IPayment>('Payment', paymentSchema);

export default Payment;