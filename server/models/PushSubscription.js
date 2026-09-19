import mongoose from "mongoose";

const pushSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required for push subscription"],
      index: true,
    },
    endpoint: {
      type: String,
      required: [true, "Push subscription endpoint is required"],
      unique: true,
      trim: true,
    },
    keys: {
      p256dh: {
        type: String,
        required: [true, "p256dh key is required"],
        trim: true,
      },
      auth: {
        type: String,
        required: [true, "auth key is required"],
        trim: true,
      },
    },
    userAgent: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const PushSubscription = mongoose.model("PushSubscription", pushSubscriptionSchema);

export default PushSubscription;
