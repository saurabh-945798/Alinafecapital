import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/config.js";

try {
  await connectDB();
  console.log("MongoDB connection test passed.");
  await mongoose.disconnect();
  process.exit(0);
} catch (error) {
  console.error("MongoDB connection test failed:");
  console.error(error);
  process.exit(1);
}
