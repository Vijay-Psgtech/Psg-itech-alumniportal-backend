const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error(
        "MongoDB connection string is missing. Set MONGODB_URI in the backend .env file.",
      );
    }

    console.log("🔄 Connecting to MongoDB...");
    const conn = await mongoose.connect(mongoUri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error(
      "Make sure MongoDB is running or check your connection string",
    );
    process.exit(1);
  }
};

module.exports = connectDB;
