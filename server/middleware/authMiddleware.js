import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Middleware to protect routes and verify JWT bearer token
 */
export const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized to access this route. No token provided.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user without password
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. User with this token no longer exists.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error(`[Auth] Token verification failed: ${error.message}`);
    return res.status(401).json({
      success: false,
      message:
        error.name === "TokenExpiredError"
          ? "Token expired. Please log in again."
          : "Not authorized. Invalid token.",
    });
  }
};

/**
 * Middleware to restrict route access to specific roles
 * @param  {...string} roles - Allowed roles ('user', 'volunteer', 'admin')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Authentication required.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access denied. Role '${req.user.role}' is not authorized to access this resource.`,
      });
    }

    next();
  };
};

export default { protect, authorize };
