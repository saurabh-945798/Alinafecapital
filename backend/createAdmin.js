/**
 * Script: Create or Promote Admin User
 * Usage:
 *   node createAdmin.js
 *
 * Optional .env values:
 *   ADMIN_PHONE=+26598765432
 *   ADMIN_PASSWORD=change-this-password
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { connectDB } from "./config/config.js";

dotenv.config();

const PHONE = process.env.ADMIN_PHONE || "+26598765432";
const PASSWORD = process.env.ADMIN_PASSWORD;
const SALT_ROUNDS = 10;

if (!PASSWORD) {
  throw new Error("ADMIN_PASSWORD is required in backend/.env before running createAdmin.js");
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
