import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";
import { connectDB } from "../config/config.js";

dotenv.config();

const targetRole = String(process.env.LEGACY_ADMIN_FALLBACK_ROLE || "APPROVAL").trim().toUpperCase();

const run = async () => {
  await connectDB();
  const result = await User.updateMany({ role: "admin" }, { $set: { role: targetRole } });
  console.log(`Migrated legacy admin users to ${targetRole}. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
  await mongoose.connection.close();
};

run().catch(async (error) => {
  console.error("Migration failed:", error);
  await mongoose.connection.close();
  process.exit(1);
});
