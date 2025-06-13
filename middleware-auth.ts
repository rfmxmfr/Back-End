/**
 * Authentication Middleware
 * Firebase Authentication and JWT verification
 */

import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';
import { config } from '@utils/config';
import { logger, logSecurityEvent } from '@utils/logger';
import User from '@models/User';
import { IAuthenticatedRequest, IUser } from '@types/index';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.firebase.projectId,
      privateKey: config.firebase.privateKey,
      clientEmail: config.firebase.clientEmail,
    }),
  });
}

/**
 * Firebase Authentication Middleware
 * Verifies Firebase ID tokens and creates/updates user records
 */
export const authenticateFirebase = async (
  req: IAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authorization header with Bearer token required',
      });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture, email_verified } = decodedToken;

    // Find or create user in database
    let user = await User.findByFirebaseUid(uid);

    if (!user) {
      // Create new user if doesn't exist
      user = new User({
        firebaseUid: uid,
        email: email || '',
        name: name || email?.split('@')[0] || 'User',
        profileImage: picture,
        isEmailVerified: email_verified || false,
        language: req.headers['accept-language']?.slice(0, 2) || 'en',
      });
      await user.save();
      
      logger.info('New user created', { 
        userId: user._id, 
        email: user.email,
        firebaseUid: uid 
      });
    } else {
      // Update last login
      await user.updateLastLogin();
    }

    // Add user info to request
    req.user = user;
    req.userId = user._id.toString();
    req.firebaseUid = uid;

    next();
  } catch (error) {
    logSecurityEvent('Invalid Firebase token', 'medium', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

/**
 * JWT Authentication Middleware
 * Verifies JWT tokens for internal API communication
 */
export const authenticateJWT = async (
  req: IAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authorization header with Bearer token required',
      });
      return;
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    const userId = decoded.userId || decoded.sub;

    // Find user in database
    const user = await User.findById(userId);
    
    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: 'User not found or inactive',
      });
      return;
    }

    // Add user info to request
    req.user = user;
    req.userId = userId;
    req.firebaseUid = user.firebaseUid;

    next();
  } catch (error) {
    logSecurityEvent('Invalid JWT token', 'medium', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

/**
 * Optional Authentication Middleware
 * Adds user info if token is present but doesn't require authentication
 */
export const optionalAuth = async (
  req: IAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    
    // Try Firebase first, then JWT
    let user: IUser | null = null;
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      user = await User.findByFirebaseUid(decodedToken.uid);
    } catch {
      try {
        const decoded = jwt.verify(token, config.jwt.secret) as any;
        user = await User.findById(decoded.userId || decoded.sub);
      } catch {
        // Token is invalid, but we continue without authentication
      }
    }

    if (user) {
      req.user = user;
      req.userId = user._id.toString();
      req.firebaseUid = user.firebaseUid;
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

/**
 * Subscription Required Middleware
 * Ensures user has an active subscription
 */
export const requireSubscription = (
  req: IAuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  if (!req.user.hasActiveSubscription()) {
    res.status(403).json({
      success: false,
      message: 'Active subscription required',
      data: {
        subscriptionStatus: req.user.subscriptionStatus,
        upgradeUrl: '/api/v1/payments/plans',
      },
    });
    return;
  }

  next();
};

/**
 * Feature Access Middleware
 * Checks if user can access specific feature based on subscription tier
 */
export const requireFeature = (feature: string) => {
  return (
    req: IAuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!req.user.canAccessFeature(feature)) {
      res.status(403).json({
        success: false,
        message: `Feature '${feature}' requires a higher subscription tier`,
        data: {
          currentTier: req.user.subscription?.tier || 'none',
          requiredFeature: feature,
          upgradeUrl: '/api/v1/payments/plans',
        },
      });
      return;
    }

    next();
  };
};

/**
 * Admin Role Middleware
 * Ensures user has admin privileges
 */
export const requireAdmin = (
  req: IAuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  // Check if user email is in admin list (you can implement role-based system)
  const adminEmails = ['admin@colorpro.com', 'support@colorpro.com'];
  
  if (!adminEmails.includes(req.user.email)) {
    logSecurityEvent('Unauthorized admin access attempt', 'high', {
      userId: req.user._id,
      email: req.user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(403).json({
      success: false,
      message: 'Admin privileges required',
    });
    return;
  }

  next();
};

/**
 * Rate Limiting for Authentication Endpoints
 */
export const authRateLimit = (maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${req.ip}-auth`;
    const now = Date.now();
    const userAttempts = attempts.get(key);

    if (userAttempts && now < userAttempts.resetTime) {
      if (userAttempts.count >= maxAttempts) {
        logSecurityEvent('Rate limit exceeded for authentication', 'high', {
          ip: req.ip,
          attempts: userAttempts.count,
        });

        res.status(429).json({
          success: false,
          message: 'Too many authentication attempts. Please try again later.',
          retryAfter: Math.ceil((userAttempts.resetTime - now) / 1000),
        });
        return;
      }
    } else {
      // Reset or create new entry
      attempts.set(key, { count: 0, resetTime: now + windowMs });
    }

    // Increment attempts on failed authentication (handled in error middleware)
    res.on('finish', () => {
      if (res.statusCode === 401) {
        const current = attempts.get(key);
        if (current) {
          current.count++;
        }
      }
    });

    next();
  };
};

/**
 * Generate JWT Token
 */
export const generateJWT = (user: IUser): string => {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      firebaseUid: user.firebaseUid,
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.expiresIn,
      issuer: 'colorpro-api',
      audience: 'colorpro-app',
    }
  );
};

/**
 * Generate Refresh Token
 */
export const generateRefreshToken = (user: IUser): string => {
  return jwt.sign(
    {
      userId: user._id,
      type: 'refresh',
    },
    config.jwt.refreshSecret,
    {
      expiresIn: config.jwt.refreshExpiresIn,
      issuer: 'colorpro-api',
      audience: 'colorpro-app',
    }
  );
};

export default {
  authenticateFirebase,
  authenticateJWT,
  optionalAuth,
  requireSubscription,
  requireFeature,
  requireAdmin,
  authRateLimit,
  generateJWT,
  generateRefreshToken,
};