import mongoose from "mongoose";

/**
 * @desc    Get API and database health status
 * @route   GET /api/health
 * @access  Public
 */
export const getHealthStatus = (req, res) => {
  const dbStates = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  const dbStateCode = mongoose.connection.readyState;

  res.status(200).json({
    success: true,
    message: "ResQHub API is running",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || "development",
    database: {
      status: dbStates[dbStateCode] || "unknown",
      host: mongoose.connection.host || null,
      name: mongoose.connection.name || null,
    },
  });
};
