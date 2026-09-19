import User, { VOLUNTEER_AREAS_OF_INTEREST } from "../models/User.js";
import generateToken from "../utils/generateToken.js";

export { VOLUNTEER_AREAS_OF_INTEREST };

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerUser = async (req, res, next) => {
  try {
    const { name, email, phone, password, role, interests } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields: name, email, phone, and password.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Restrict admin role from public registration
    if (role && role.toLowerCase() === "admin") {
      return res.status(403).json({
        success: false,
        message: "Registration as an administrator is not permitted through this endpoint.",
      });
    }

    // Determine role (only 'user' and 'volunteer' are allowed publicly)
    let assignedRole = "user";
    if (role) {
      const lowerRole = role.toLowerCase();
      if (!["user", "volunteer"].includes(lowerRole)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role specified. Allowed public roles are 'user' and 'volunteer'.",
        });
      }
      assignedRole = lowerRole;
    }

    // Validate areas of interest for volunteers
    if (assignedRole === "volunteer") {
      if (!Array.isArray(interests) || interests.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Please select at least one area of interest.",
        });
      }

      const invalidInterests = interests.filter(
        (item) => !VOLUNTEER_AREAS_OF_INTEREST.includes(item)
      );

      if (invalidInterests.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid area of interest selected: ${invalidInterests.join(", ")}.`,
        });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "A user with this email address already exists.",
      });
    }

    // Create user (password is automatically hashed by User model pre-save hook)
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password,
      role: assignedRole,
      interests: assignedRole === "volunteer" ? [...new Set(interests)] : [],
    });

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    // Return safe user information (never return password or hash)
    return res.status(201).json({
      success: true,
      message: "User registered successfully.",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        interests: user.interests,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide both email and password.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Verify password using bcryptjs
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    // Return safe user information (never return password or hash)
    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        interests: user.interests || [],
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current authenticated user profile
 * @route   GET /api/auth/me
 * @access  Private (Protected by JWT)
 */
export const getMe = async (req, res) => {
  // req.user is set by the protect middleware and excludes password
  return res.status(200).json({
    success: true,
    user: req.user,
  });
};

/**
 * @desc    Request password reset instructions
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide your registered email address.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email address. Please check your email or create a new account.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Password reset instructions have been sent to ${normalizedEmail}. Please check your inbox.`,
      email: normalizedEmail,
    });
  } catch (error) {
    next(error);
  }
};

