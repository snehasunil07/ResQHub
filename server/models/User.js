import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export const VOLUNTEER_AREAS_OF_INTEREST = [
  "Medical Emergency",
  "Fire & Rescue",
  "Accident Response",
  "Natural Disaster Relief",
  "Missing Person Search",
  "Food & Essential Supplies",
  "Blood Donation",
  "First Aid",
  "Transportation & Evacuation",
  "Shelter & Accommodation",
  "Other",
];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        "Please provide a valid email address",
      ],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    role: {
      type: String,
      enum: {
        values: ["user", "volunteer", "admin"],
        message: "{VALUE} is not a valid role. Allowed roles: user, volunteer, admin",
      },
      default: "user",
      lowercase: true,
    },
    interests: {
      type: [String],
      enum: {
        values: VOLUNTEER_AREAS_OF_INTEREST,
        message: "{VALUE} is not a valid area of interest",
      },
      default: [],
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
