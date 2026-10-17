import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../config/config.js";
import User from "../models/User.js";
import { normalizePhone, isValidE164Phone, normalizeEmail } from "../utils/normalize.js";

dotenv.config();

const ROLE = "SUPER_ADMIN";
const RAW_PHONE = String(process.env.SUPER_ADMIN_PHONE || "").trim();
const PASSWORD = String(process.env.SUPER_ADMIN_PASSWORD || "");
const FULL_NAME = String(process.env.SUPER_ADMIN_NAME || "Super Admin").trim();
const EMAIL = normalizeEmail(process.env.SUPER_ADMIN_EMAIL || "");

const run = async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error("Missing MONGO_URI in environment.");
    if (!RAW_PHONE || !PASSWORD || !EMAIL) {
      throw new Error("SUPER_ADMIN_PHONE, SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required.");
    }
    if (PASSWORD.length < 12) throw new Error("SUPER_ADMIN_PASSWORD must contain at least 12 characters.");

    await connectDB();
    const phone = normalizePhone(RAW_PHONE);
    if (!isValidE164Phone(phone)) throw new Error("SUPER_ADMIN_PHONE is not a valid E.164 phone number.");

    let user = await User.findOne({ $or: [{ phone }, { email: EMAIL }] });
    if (user) {
      user.role = ROLE;
      user.isActive = true;
      user.password = PASSWORD;
      user.loginAttempts = 0;
      user.lockUntil = null;
      user.email = EMAIL;
      user.phone = phone;
      user.fullName = FULL_NAME || user.fullName;
      await user.save();
      console.log(`Existing user upgraded to ${ROLE}.`);
    } else {
      user = await User.create({
        fullName: FULL_NAME, email: EMAIL, phone, password: PASSWORD, role: ROLE, isActive: true, loginAttempts: 0, lockUntil: null,
      });
      console.log(`New ${ROLE} user created.`);
    }
    console.log(`SUPER_ADMIN ready. User ID: ${user._id}`);
  } catch (error) {
    console.error("Failed to create/upgrade SUPER_ADMIN:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

await run();
