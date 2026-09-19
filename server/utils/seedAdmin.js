import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

/**
 * CLI utility to securely seed initial test and administrator accounts
 */
export const seedAdmin = async () => {
  try {
    console.log("[SeedAdmin] Connecting to MongoDB...");
    const conn = await connectDB();

    if (!conn) {
      console.error("[SeedAdmin] Could not establish MongoDB connection. Check your MONGO_URI in .env.");
      process.exit(1);
    }

    const demoAccounts = [
      {
        name: process.env.ADMIN_NAME || "ResQHub Administrator",
        email: (process.env.ADMIN_EMAIL || "admin@resqhub.org").toLowerCase().trim(),
        phone: process.env.ADMIN_PHONE || "9999999999",
        password: process.env.ADMIN_PASSWORD || "Admin@ResQHub2026",
        role: "admin",
      },
      {
        name: "Alex Volunteer",
        email: "volunteer@resqhub.org",
        phone: "9876543210",
        password: "Volunteer@123",
        role: "volunteer",
      },
      {
        name: "John Citizen",
        email: "user@resqhub.org",
        phone: "9123456780",
        password: "User@12345",
        role: "user",
      },
      {
        name: "Sneha Sunil",
        email: "snehasunil0707@gmail.com",
        phone: "9845012345",
        password: "Password@123",
        role: "user",
      },
    ];

    for (const acc of demoAccounts) {
      const existing = await User.findOne({ email: acc.email });
      if (existing) {
        console.log(`[SeedAdmin] Account already exists: ${acc.email} (${existing.role})`);
      } else {
        const created = await User.create(acc);
        console.log(`[SeedAdmin] Created: ${created.name} <${created.email}> [${created.role}]`);
      }
    }

    console.log("[SeedAdmin] All demo accounts initialized successfully!");
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`[SeedAdmin] Error seeding accounts: ${error.message}`);
    process.exit(1);
  }
};

// If invoked directly from CLI
if (process.argv[1] && process.argv[1].includes("seedAdmin.js")) {
  seedAdmin();
}

export default seedAdmin;
