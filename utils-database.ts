/**
 * Database Connection Utility
 * MongoDB connection with Mongoose ODM
 */

import mongoose from 'mongoose';
import { config } from './config';
import { logger } from './logger';

export class Database {
  private static instance: Database;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('📦 Already connected to MongoDB');
      return;
    }

    try {
      // Mongoose connection options
      const options = {
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        bufferCommands: false, // Disable mongoose buffering
        bufferMaxEntries: 0, // Disable mongoose buffering
      };

      // Connect to MongoDB
      await mongoose.connect(config.mongodbUri, options);

      this.isConnected = true;
      logger.info('✅ Connected to MongoDB successfully');

      // Handle connection events
      this.setupConnectionEvents();

    } catch (error) {
      logger.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('🔌 Disconnected from MongoDB');
    } catch (error) {
      logger.error('❌ Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public async dropDatabase(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to database');
    }

    try {
      await mongoose.connection.dropDatabase();
      logger.info('🗑️  Database dropped successfully');
    } catch (error) {
      logger.error('❌ Error dropping database:', error);
      throw error;
    }
  }

  public getConnection(): mongoose.Connection {
    return mongoose.connection;
  }

  public isConnectedToDatabase(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  private setupConnectionEvents(): void {
    const connection = mongoose.connection;

    connection.on('connected', () => {
      logger.info('🟢 Mongoose connected to MongoDB');
    });

    connection.on('error', (error) => {
      logger.error('🔴 Mongoose connection error:', error);
    });

    connection.on('disconnected', () => {
      logger.warn('🟡 Mongoose disconnected from MongoDB');
      this.isConnected = false;
    });

    connection.on('reconnected', () => {
      logger.info('🔵 Mongoose reconnected to MongoDB');
      this.isConnected = true;
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }
}

// Export singleton instance methods
const database = Database.getInstance();

export const connectDatabase = () => database.connect();
export const disconnectDatabase = () => database.disconnect();
export const dropDatabase = () => database.dropDatabase();
export const getDatabaseConnection = () => database.getConnection();
export const isDatabaseConnected = () => database.isConnectedToDatabase();

export default database;