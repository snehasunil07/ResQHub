import mongoose from "mongoose";
import EmergencyRequest from "../models/EmergencyRequest.js";

const VALID_CATEGORIES = ["Blood", "Food", "Medicine", "Transport", "Rescue"];
const VALID_URGENCIES = ["Low", "Medium", "High", "Critical"];
const VALID_STATUSES = ["Pending", "Verified", "Accepted", "Completed", "Cancelled"];

/**
 * @desc    Create a new emergency request
 * @route   POST /api/requests
 * @access  Private (Authenticated users & volunteers)
 */
export const createRequest = async (req, res, next) => {
  try {
    const { title, description, category, location, urgency } = req.body;

    // Validate required fields
    if (!title || !description || !category || !location) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields: title, description, category, and location.",
      });
    }

    if (title.trim().length > 150) {
      return res.status(400).json({
        success: false,
        message: "Emergency title cannot exceed 150 characters.",
      });
    }

    // Validate Category
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid emergency category. Allowed categories: ${VALID_CATEGORIES.join(", ")}.`,
      });
    }

    // Validate Urgency if provided
    const assignedUrgency = urgency || "Medium";
    if (!VALID_URGENCIES.includes(assignedUrgency)) {
      return res.status(400).json({
        success: false,
        message: `Invalid urgency level. Allowed levels: ${VALID_URGENCIES.join(", ")}.`,
      });
    }

    // Image handling
    let imagePath = null;
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    } else if (req.body.image && typeof req.body.image === "string") {
      imagePath = req.body.image.trim();
    }

    // Create the emergency request
    // Security: createdBy is strictly enforced from authenticated session; status starts as "Pending"
    const request = await EmergencyRequest.create({
      title: title.trim(),
      description: description.trim(),
      category,
      location: location.trim(),
      urgency: assignedUrgency,
      status: "Pending",
      image: imagePath,
      createdBy: req.user._id,
      acceptedBy: null,
    });

    // Populate createdBy details (excluding password)
    await request.populate("createdBy", "name email phone role");

    return res.status(201).json({
      success: true,
      message: "Emergency request created successfully.",
      request,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all emergency requests accessible to the user
 * @route   GET /api/requests
 * @access  Private
 */
export const getRequests = async (req, res, next) => {
  try {
    let query = {};

    // Role-based visibility
    if (req.user.role === "admin") {
      // Admin sees all emergency requests
      query = {};
    } else if (req.user.role === "volunteer") {
      // Volunteers see active/verified requests plus their own created requests
      query = {
        $or: [
          { status: { $in: ["Pending", "Verified", "Accepted", "Completed"] } },
          { createdBy: req.user._id },
        ],
      };
    } else {
      // Regular users only see their own created requests
      query = { createdBy: req.user._id };
    }

    const requests = await EmergencyRequest.find(query)
      .populate("createdBy", "name email phone role")
      .populate("acceptedBy", "name email phone role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single emergency request by ID
 * @route   GET /api/requests/:id
 * @access  Private
 */
export const getRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid emergency request ID format.",
      });
    }

    const request = await EmergencyRequest.findById(id)
      .populate("createdBy", "name email phone role")
      .populate("acceptedBy", "name email phone role");

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Emergency request not found.",
      });
    }

    // Role-based ownership & visibility check
    const isOwner = request.createdBy?._id?.equals(req.user._id) || request.createdBy?.equals?.(req.user._id);
    const isAdmin = req.user.role === "admin";
    const isVolunteerVisible =
      req.user.role === "volunteer" &&
      ["Pending", "Verified", "Accepted", "Completed"].includes(request.status);

    if (!isAdmin && !isOwner && !isVolunteerVisible) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to view this emergency request.",
      });
    }

    return res.status(200).json({
      success: true,
      request,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update emergency request
 * @route   PUT /api/requests/:id
 * @access  Private
 */
export const updateRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid emergency request ID format.",
      });
    }

    const request = await EmergencyRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Emergency request not found.",
      });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner = request.createdBy.equals(req.user._id);

    // Non-admins can only update their own requests while status is "Pending"
    if (!isAdmin) {
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You can only edit your own emergency requests.",
        });
      }

      if (request.status !== "Pending") {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You can only edit requests that are still in Pending status.",
        });
      }
    }

    const { title, description, category, location, urgency, status } = req.body;

    // Validate Category if provided
    if (category !== undefined) {
      if (!VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({
          success: false,
          message: `Invalid emergency category. Allowed categories: ${VALID_CATEGORIES.join(", ")}.`,
        });
      }
      request.category = category;
    }

    // Validate Urgency if provided
    if (urgency !== undefined) {
      if (!VALID_URGENCIES.includes(urgency)) {
        return res.status(400).json({
          success: false,
          message: `Invalid urgency level. Allowed levels: ${VALID_URGENCIES.join(", ")}.`,
        });
      }
      request.urgency = urgency;
    }

    // Validate and update Status (Admin only)
    if (status !== undefined) {
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: Only administrators can modify request status.",
        });
      }
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Allowed statuses: ${VALID_STATUSES.join(", ")}.`,
        });
      }
      request.status = status;
    }

    if (title !== undefined) {
      if (title.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Emergency title cannot be empty.",
        });
      }
      if (title.trim().length > 150) {
        return res.status(400).json({
          success: false,
          message: "Emergency title cannot exceed 150 characters.",
        });
      }
      request.title = title.trim();
    }

    if (description !== undefined) {
      if (description.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Emergency description cannot be empty.",
        });
      }
      request.description = description.trim();
    }

    if (location !== undefined) {
      if (location.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Emergency location cannot be empty.",
        });
      }
      request.location = location.trim();
    }

    // Save updated request to MongoDB
    await request.save();

    await request.populate("createdBy", "name email phone role");
    await request.populate("acceptedBy", "name email phone role");

    return res.status(200).json({
      success: true,
      message: "Emergency request updated successfully.",
      request,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete emergency request
 * @route   DELETE /api/requests/:id
 * @access  Private
 */
export const deleteRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid emergency request ID format.",
      });
    }

    const request = await EmergencyRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Emergency request not found.",
      });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner = request.createdBy.equals(req.user._id);

    // Non-admins can only delete their own requests while status is "Pending"
    if (!isAdmin) {
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You can only delete your own emergency requests.",
        });
      }

      if (request.status !== "Pending") {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You can only delete requests that are still in Pending status.",
        });
      }
    }

    await request.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Emergency request deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all available emergency requests for volunteers (status: "Pending" or "Verified")
 * @route   GET /api/requests/available
 * @access  Private (Volunteers & Admins)
 */
export const getAvailableRequests = async (req, res, next) => {
  try {
    const requests = await EmergencyRequest.find({
      status: { $in: ["Pending", "Verified"] },
    })
      .populate("createdBy", "name email phone role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get emergency requests accepted by the current volunteer
 * @route   GET /api/requests/my-accepted
 * @access  Private (Volunteers & Admins)
 */
export const getVolunteerAcceptedRequests = async (req, res, next) => {
  try {
    const query =
      req.user.role === "admin"
        ? { status: { $in: ["Accepted", "Completed", "Cancelled"] } }
        : { acceptedBy: req.user._id };

    const requests = await EmergencyRequest.find(query)
      .populate("createdBy", "name email phone role")
      .populate("acceptedBy", "name email phone role")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Volunteer accepts a verified emergency request (concurrency safe)
 * @route   PUT /api/requests/:id/accept
 * @access  Private (Volunteers & Admins)
 */
export const acceptRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid emergency request ID format.",
      });
    }

    // Atomic find and update to prevent race conditions between concurrent volunteers
    const request = await EmergencyRequest.findOneAndUpdate(
      { _id: id, status: { $in: ["Pending", "Verified"] } },
      { status: "Accepted", acceptedBy: req.user._id },
      { new: true, runValidators: true }
    )
      .populate("createdBy", "name email phone role")
      .populate("acceptedBy", "name email phone role");

    if (!request) {
      // Inspect why it failed to update
      const existing = await EmergencyRequest.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Emergency request not found.",
        });
      }

      if (existing.status === "Accepted") {
        return res.status(409).json({
          success: false,
          message: "Conflict: This emergency request has already been accepted by another volunteer.",
        });
      }

      return res.status(400).json({
        success: false,
        message: `Cannot accept request. Only active requests in 'Pending' or 'Verified' status can be accepted. Current status: '${existing.status}'.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Emergency request accepted successfully.",
      request,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Volunteer marks an accepted emergency request as completed
 * @route   PUT /api/requests/:id/complete
 * @access  Private (Volunteers & Admins)
 */
export const completeRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid emergency request ID format.",
      });
    }

    const request = await EmergencyRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Emergency request not found.",
      });
    }

    if (request.status !== "Accepted") {
      return res.status(400).json({
        success: false,
        message: `Cannot complete request. Only requests with status 'Accepted' can be completed. Current status: '${request.status}'.`,
      });
    }

    const isAdmin = req.user.role === "admin";
    const isAssignedVolunteer = request.acceptedBy && request.acceptedBy.equals(req.user._id);

    if (!isAdmin && !isAssignedVolunteer) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You can only complete emergency requests that you have accepted.",
      });
    }

    request.status = "Completed";
    await request.save();

    await request.populate("createdBy", "name email phone role");
    await request.populate("acceptedBy", "name email phone role");

    return res.status(200).json({
      success: true,
      message: "Emergency request marked as completed.",
      request,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Volunteer cancels/releases an accepted emergency request
 * @route   PUT /api/requests/:id/cancel
 * @access  Private (Volunteers & Admins)
 */
export const cancelAcceptedRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid emergency request ID format.",
      });
    }

    const request = await EmergencyRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Emergency request not found.",
      });
    }

    if (request.status !== "Accepted") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel request. Only requests with status 'Accepted' can be cancelled. Current status: '${request.status}'.`,
      });
    }

    const isAdmin = req.user.role === "admin";
    const isAssignedVolunteer = request.acceptedBy && request.acceptedBy.equals(req.user._id);

    if (!isAdmin && !isAssignedVolunteer) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You can only cancel or release emergency requests that you have accepted.",
      });
    }

    request.status = "Cancelled";
    await request.save();

    await request.populate("createdBy", "name email phone role");
    await request.populate("acceptedBy", "name email phone role");

    return res.status(200).json({
      success: true,
      message: "Emergency request cancelled successfully.",
      request,
    });
  } catch (error) {
    next(error);
  }
};
