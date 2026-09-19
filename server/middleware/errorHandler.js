/**
 * Middleware to handle 404 - Not Found routes
 */
export const notFound = (req, res, next) => {
  const error = new Error(`Resource Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Centralized error handler middleware
 * Note: Express requires all 4 parameters for error middleware recognition
 */
export const errorHandler = (err, req, res, _next) => {
  // If status code is 200, default to 500 internal server error
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

