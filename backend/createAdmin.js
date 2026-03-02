/**
 * Script: Create or Promote Admin User
 * Usage:
 *   node scripts/createAdmin.js
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

// ====== CONFIG ======
const PHONE = "+26598765432"
const PASSWORD = "Alinafe";
const SALT_ROUNDS = 10;

// ====== Connect MongoDB ======
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Failed:", err.message);
    process.exit(1);
  }
}

// ====== User Schema (Minimal if not importing existing model) ======
const userSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: "user" },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

// ====== Create / Promote Admin ======
async function createOrPromoteAdmin() {
  try {
    const existingUser = await User.findOne({ phone: PHONE });

    if (existingUser) {
      console.log("⚡ User found. Promoting to admin...");

      existingUser.role = "admin";

      // Optional: reset password as well
      const hashedPassword = await bcrypt.hash(PASSWORD, SALT_ROUNDS);
      existingUser.password = hashedPassword;

      await existingUser.save();

      console.log("✅ User promoted to admin successfully");
    } else {
      console.log("⚡ User not found. Creating new admin user...");

      const hashedPassword = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

      await User.create({
        phone: PHONE,
        password: hashedPassword,
        role: "admin",
      });

      console.log("✅ Admin user created successfully");
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    mongoose.connection.close();
  }
}

// ====== Run ======
(async () => {
  await connectDB();
  await createOrPromoteAdmin();
})();