/**
 * File Upload Middleware
 * Multer configuration with AWS S3 storage and file validation
 */

import multer from 'multer';
import multerS3 from 'multer-s3';
import AWS from 'aws-sdk';
import sharp from 'sharp';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import { config } from '@utils/config';
import { logger } from '@utils/logger';
import { IAuthenticatedRequest, IFileUpload, IUploadResult } from '@types/index';

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  region: config.aws.region,
});

/**
 * Generate unique filename
 */
const generateFilename = (originalname: string): string => {
  const ext = path.extname(originalname);
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(8).toString('hex');
  return `${timestamp}-${randomBytes}${ext}`;
};

/**
 * S3 Storage Configuration
 */
const s3Storage = multerS3({
  s3: s3,
  bucket: config.aws.s3Bucket,
  acl: 'private', // Files are private by default
  key: (req: IAuthenticatedRequest, file: Express.Multer.File, cb) => {
    const userId = req.userId || 'anonymous';
    const folder = file.fieldname === 'profileImage' ? 'profiles' : 'analysis';
    const filename = generateFilename(file.originalname);
    const key = `${folder}/${userId}/${filename}`;
    cb(null, key);
  },
  metadata: (req: IAuthenticatedRequest, file: Express.Multer.File, cb) => {
    cb(null, {
      userId: req.userId || 'anonymous',
      uploadedAt: new Date().toISOString(),
      originalName: file.originalname,
    });
  },
  contentType: multerS3.AUTO_CONTENT_TYPE,
});

/**
 * Local Storage Configuration (for development)
 */
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const filename = generateFilename(file.originalname);
    cb(null, filename);
  },
});

/**
 * File Filter Function
 */
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  // Check file type
  if (!config.allowedFileTypes.includes(file.mimetype)) {
    const error = new Error(
      `Invalid file type. Allowed types: ${config.allowedFileTypes.join(', ')}`
    ) as any;
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }

  // Check file size (additional check beyond multer limits)
  if (file.size && file.size > config.maxFileSize) {
    const error = new Error(
      `File too large. Maximum size: ${(config.maxFileSize / 1024 / 1024).toFixed(1)}MB`
    ) as any;
    error.code = 'FILE_TOO_LARGE';
    return cb(error, false);
  }

  cb(null, true);
};

/**
 * Multer Configuration
 */
const createMulterConfig = (fieldName: string, maxFiles: number = 1) => {
  return multer({
    storage: config.isProduction ? s3Storage : localStorage,
    fileFilter,
    limits: {
      fileSize: config.maxFileSize,
      files: maxFiles,
      fields: 10,
    },
  });
};

/**
 * Single File Upload Middleware
 */
export const uploadSingle = (fieldName: string) => {
  const upload = createMulterConfig(fieldName, 1).single(fieldName);

  return (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
    upload(req, res, (error: any) => {
      if (error) {
        logger.error('File upload error:', error);
        
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `File too large. Maximum size: ${(config.maxFileSize / 1024 / 1024).toFixed(1)}MB`,
          });
        }
        
        if (error.code === 'INVALID_FILE_TYPE') {
          return res.status(400).json({
            success: false,
            message: error.message,
          });
        }

        return res.status(400).json({
          success: false,
          message: 'File upload failed',
          error: error.message,
        });
      }

      next();
    });
  };
};

/**
 * Multiple Files Upload Middleware
 */
export const uploadMultiple = (fieldName: string, maxFiles: number = 5) => {
  const upload = createMulterConfig(fieldName, maxFiles).array(fieldName, maxFiles);

  return (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
    upload(req, res, (error: any) => {
      if (error) {
        logger.error('Multiple files upload error:', error);
        
        if (error.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: `Too many files. Maximum allowed: ${maxFiles}`,
          });
        }

        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `File too large. Maximum size: ${(config.maxFileSize / 1024 / 1024).toFixed(1)}MB`,
          });
        }

        return res.status(400).json({
          success: false,
          message: 'Files upload failed',
          error: error.message,
        });
      }

      next();
    });
  };
};

/**
 * Analysis Photos Upload Middleware
 * Handles multiple photo types for color analysis
 */
export const uploadAnalysisPhotos = () => {
  const upload = createMulterConfig('photos', 4).fields([
    { name: 'face_selfie', maxCount: 1 },
    { name: 'full_body', maxCount: 1 },
    { name: 'natural_light', maxCount: 1 },
    { name: 'style_inspiration', maxCount: 1 },
  ]);

  return (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
    upload(req, res, (error: any) => {
      if (error) {
        logger.error('Analysis photos upload error:', error);
        return res.status(400).json({
          success: false,
          message: 'Photo upload failed',
          error: error.message,
        });
      }

      // Validate that at least one photo is uploaded
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (!files || Object.keys(files).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one photo is required for analysis',
        });
      }

      next();
    });
  };
};

/**
 * Image Processing Middleware
 * Optimizes images using Sharp
 */
export const processImage = (options: {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
} = {}) => {
  return async (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      if (!file) {
        return next();
      }

      const {
        width = 1200,
        height = 1200,
        quality = 85,
        format = 'jpeg',
      } = options;

      let imageBuffer: Buffer;

      if (file.buffer) {
        // File is in memory
        imageBuffer = file.buffer;
      } else if (file.path) {
        // File is on disk
        imageBuffer = require('fs').readFileSync(file.path);
      } else {
        return next();
      }

      // Process image with Sharp
      const processedBuffer = await sharp(imageBuffer)
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toFormat(format, { quality })
        .toBuffer();

      // Update file information
      file.buffer = processedBuffer;
      file.size = processedBuffer.length;
      file.mimetype = `image/${format}`;

      // If using S3, upload the processed image
      if (config.isProduction && file.key) {
        await s3.putObject({
          Bucket: config.aws.s3Bucket,
          Key: file.key,
          Body: processedBuffer,
          ContentType: file.mimetype,
          ACL: 'private',
        }).promise();
      }

      logger.info('Image processed successfully', {
        originalSize: imageBuffer.length,
        processedSize: processedBuffer.length,
        compression: ((1 - processedBuffer.length / imageBuffer.length) * 100).toFixed(1) + '%',
      });

      next();
    } catch (error) {
      logger.error('Image processing error:', error);
      res.status(500).json({
        success: false,
        message: 'Image processing failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
};

/**
 * Get File URL
 * Generates signed URL for private S3 objects
 */
export const getFileUrl = async (key: string, expiresIn: number = 3600): Promise<string> => {
  if (config.isProduction) {
    // Generate signed URL for S3
    return s3.getSignedUrl('getObject', {
      Bucket: config.aws.s3Bucket,
      Key: key,
      Expires: expiresIn,
    });
  } else {
    // Return local file URL
    return `/uploads/${path.basename(key)}`;
  }
};

/**
 * Delete File
 */
export const deleteFile = async (key: string): Promise<void> => {
  if (config.isProduction) {
    await s3.deleteObject({
      Bucket: config.aws.s3Bucket,
      Key: key,
    }).promise();
  } else {
    const fs = require('fs').promises;
    const filePath = path.join(process.cwd(), 'uploads', path.basename(key));
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist, ignore error
    }
  }
};

/**
 * Extract Upload Results
 * Helper function to extract file information from multer result
 */
export const extractUploadResults = (files: Express.Multer.File | Express.Multer.File[]): IUploadResult[] => {
  const fileArray = Array.isArray(files) ? files : [files];
  
  return fileArray.map(file => ({
    url: config.isProduction ? (file as any).location : `/uploads/${file.filename}`,
    key: config.isProduction ? (file as any).key : file.filename!,
    bucket: config.aws.s3Bucket,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  }));
};

/**
 * Validate Image Metadata
 */
export const validateImageMetadata = async (
  req: IAuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const file = req.file;
    if (!file) {
      return next();
    }

    let imageBuffer: Buffer;
    if (file.buffer) {
      imageBuffer = file.buffer;
    } else if (file.path) {
      imageBuffer = require('fs').readFileSync(file.path);
    } else {
      return next();
    }

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    
    // Validate minimum dimensions
    const minWidth = 200;
    const minHeight = 200;
    
    if (!metadata.width || !metadata.height) {
      return res.status(400).json({
        success: false,
        message: 'Unable to read image dimensions',
      });
    }

    if (metadata.width < minWidth || metadata.height < minHeight) {
      return res.status(400).json({
        success: false,
        message: `Image too small. Minimum dimensions: ${minWidth}x${minHeight}px`,
      });
    }

    // Add metadata to file object
    (file as any).metadata = {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      space: metadata.space,
      channels: metadata.channels,
      depth: metadata.depth,
      density: metadata.density,
      hasProfile: metadata.hasProfile,
      hasAlpha: metadata.hasAlpha,
    };

    next();
  } catch (error) {
    logger.error('Image metadata validation error:', error);
    res.status(400).json({
      success: false,
      message: 'Invalid image file',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default {
  uploadSingle,
  uploadMultiple,
  uploadAnalysisPhotos,
  processImage,
  validateImageMetadata,
  getFileUrl,
  deleteFile,
  extractUploadResults,
};