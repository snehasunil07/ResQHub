import mongoose from "mongoose";

const emergencyRequestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Emergency title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    description: {
      type: String,
      required: [true, "Emergency description is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: ["Blood", "Food", "Medicine", "Transport", "Rescue"],
        message: "{VALUE} is not a valid emergency category",
      },
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    urgency: {
      type: String,
      required: [true, "Urgency level is required"],
      enum: {
        values: ["Low", "Medium", "High", "Critical"],
        message: "{VALUE} is not a valid urgency level",
      },
      default: "Medium",
    },
    status: {
      type: String,
      required: [true, "Status is required"],
      enum: {
        values: ["Pending", "Verified", "Accepted", "Completed", "Cancelled"],
        message: "{VALUE} is not a valid status",
      },
      default: "Pending",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator user reference is required"],
    },
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    image: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

const EmergencyRequest = mongoose.model(
  "EmergencyRequest",
  emergencyRequestSchema
);

export default EmergencyRequest;
