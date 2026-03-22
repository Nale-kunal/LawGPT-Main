import mongoose from 'mongoose';
import logger from '../utils/logger.js';

/**
 * MongoDB Atlas Connection Configuration
 * 
 * Connects to MongoDB Atlas M0 free tier with proper error handling,
 * connection pooling, and automatic reconnection.
 */

const MONGODB_URI = process.env.MONGODB_URI;

// Connection options optimized for MongoDB Atlas M0 free tier
const options = {
    maxPoolSize: 10, // Limit connections for M0 tier
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4, // Use IPv4, skip trying IPv6
};

let isConnected = false;

/**
 * Connect to MongoDB Atlas
 * @returns {Promise<void>}
 */
export async function connectMongoDB() {
    if (isConnected) {
        logger.debug('MongoDB: Already connected');
        return;
    }

    if (!MONGODB_URI) {
        throw new Error(
            'MONGODB_URI is not defined. Please set it in your .env file.\n' +
            'Get your connection string from: https://cloud.mongodb.com/ → Connect → Drivers → Node.js'
        );
    }

    try {
        await mongoose.connect(MONGODB_URI, options);
        isConnected = true;
        logger.info('✅ MongoDB Atlas connected successfully');
        logger.info('   Database: %s', mongoose.connection.name);
    } catch (error) {
        logger.error({ err: error.message }, '❌ MongoDB connection error');
        throw error;
    }
}

/**
 * Disconnect from MongoDB
 * @returns {Promise<void>}
 */
export async function disconnectMongoDB() {
    if (!isConnected) {
        return;
    }

    try {
        await mongoose.disconnect();
        isConnected = false;
        logger.info('MongoDB disconnected');
    } catch (error) {
        logger.error({ err: error }, 'Error disconnecting from MongoDB');
        throw error;
    }
}

// Handle connection events
mongoose.connection.on('connected', () => {
    logger.info('Mongoose connected to MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
    logger.error({ err }, 'Mongoose connection error');
    isConnected = false;
});

mongoose.connection.on('disconnected', () => {
    logger.info('Mongoose disconnected from MongoDB Atlas');
    isConnected = false;
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await disconnectMongoDB();
    process.exit(0);
});

export default mongoose;
