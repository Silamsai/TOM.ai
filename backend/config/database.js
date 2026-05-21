const mongoose = require('mongoose');

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

    // Seed admin@tomai.com user if it doesn't exist in standard user database
    try {
      const User = require('../models/User');
      const adminExists = await User.findOne({ email: 'admin@tomai.com' });
      if (!adminExists) {
        await User.create({
          email: 'admin@tomai.com',
          password: 'Admin@123',
          name: 'Admin User',
          emailVerified: true
        });
        console.log('🌱 Seeded admin@tomai.com into user database successfully!');
      } else {
        console.log('🌱 Admin user admin@tomai.com already exists in user database.');
      }
    } catch (seedErr) {
      console.error('⚠️ [Seed Error] Failed to auto-seed admin user:', seedErr.message);
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
    // Exit process with failure — Railway/PM2 will restart
    process.exit(1);
  }
};

module.exports = connectDB;
