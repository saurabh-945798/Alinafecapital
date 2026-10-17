/**
 * Script: Create or Promote Admin User
 * Usage:
 *   node createAdmin.js
 *
 * Optional .env values:
 *   ADMIN_PHONE=+265XXXXXXXXX
 *   ADMIN_PASSWORD=change-this-password
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { connectDB } from "./config/config.js";

dotenv.config();

const PHONE = String(process.env.ADMIN_PHONE || "").trim();
const PASSWORD = process.env.ADMIN_PASSWORD;
const SALT_ROUNDS = 10;

if (!PHONE || !PASSWORD) {
  throw new Error("ADMIN_PHONE and ADMIN_PASSWORD are required before running createAdmin.js");
}
if (PASSWORD.length < 12) {
  throw new Error("ADMIN_PASSWORD must contain at least 12 characters");
}

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: "user" },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

async function createOrPromoteAdmin() {
  try {
    const existingUser = await User.findOne({ phone: PHONE });

    if (existingUser) {
      console.log("User found. Promoting to admin...");
      existingUser.role = "admin";
      existingUser.password = await bcrypt.hash(PASSWORD, SALT_ROUNDS);
      await existingUser.save();
      console.log("Admin user promoted successfully.");
      return;
    }

    console.log("User not found. Creating new admin user...");
    await User.create({
      phone: PHONE,
      password: await bcrypt.hash(PASSWORD, SALT_ROUNDS),
      role: "admin",
    });
    console.log("Admin user created successfully.");
  } catch (error) {
    console.error("Admin creation failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

await connectDB();
await createOrPromoteAdmin();
