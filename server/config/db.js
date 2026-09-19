import mongoose from "mongoose";

/**
 * Connect to MongoDB with connection event listeners and graceful fallback
 */
export const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI;

  if (!mongoURI) {
    console.warn(
      "[MongoDB] Warning: MONGO_URI is not defined in environment variables. Please check your .env file."
    );
    return null;
  }

  // Connection event listeners
  mongoose.connection.on("connected", () => {
    console.log(`[MongoDB] Connected successfully to: ${mongoose.connection.host}`);
  });

  mongoose.connection.on("error", (err) => {
    console.error(`[MongoDB] Connection error: ${err.message}`);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[MongoDB] Connection disconnected.");
  });

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s if server is unreachable
    });
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Failed to connect to MongoDB: ${error.message}`);
    console.info(
      "[MongoDB] Tip: If using MongoDB Atlas, make sure your IP is allowlisted and MONGO_URI is set in .env."
    );
    return null;
  }
};

export default connectDB;
