const mongoose = require('./dbCompat');

/**
 * Connects the application to MongoDB using Mongoose.
 * Uses the MONGODB_URI and DB_NAME environment variables.
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'tom-ai-db',
      // Recommended options for production stability
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    if (!process.env.ADMIN_PASSWORD) {
      console.warn('⚠️ ADMIN_PASSWORD is not configured. Admin login is disabled until it is set.');
    }

    // Log when disconnected
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected.');
    });
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
