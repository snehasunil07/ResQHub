import jwt from "jsonwebtoken";

/**
 * Generate a signed JWT token for a user
 * @param {string} id - User ObjectId string
 * @param {string} role - User role (user, volunteer, admin)
 * @returns {string} Signed JWT token
 */
export const generateToken = (id, role = "user") => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured in environment variables.");
  }

  return jwt.sign({ id, role }, secret, {
    expiresIn: "7d", // Token valid for 7 days
  });
};

export default generateToken;
