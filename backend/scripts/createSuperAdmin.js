import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../config/config.js";
import User from "../models/User.js";
import { normalizePhone, isValidE164Phone, normalizeEmail } from "../utils/normalize.js";

dotenv.config();

const RAW_PHONE = "98765432";
const PASSWORD = "Admin@123";

const ROLE = "SUPER_ADMIN";
const DEFAULT_FULL_NAME = "Super Admin";
const DEFAULT_EMAIL = "superadmin@alinafecapital.com";

const run = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("Missing MONGO_URI in environment.");
    }

    await connectDB();
    console.log("MongoDB connected.");

    const phone = normalizePhone(RAW_PHONE);
    if (!isValidE164Phone(phone)) {
      throw new Error(`Invalid phone after normalization: ${phone}`);
    }

    const email = normalizeEmail(DEFAULT_EMAIL);

    let user = await User.findOne({ phone });

    if (user) {
      user.role = ROLE;
      user.isActive = true;
      user.password = PASSWORD; // hashed by pre-save hook
      user.loginAttempts = 0;
      user.lockUntil = null;
      if (!user.email) user.email = email;
      if (!user.fullName) user.fullName = DEFAULT_FULL_NAME;
      await user.save();
      console.log(`Existing user upgraded to ${ROLE} and password reset.`);
    } else {
      user = await User.create({
        fullName: DEFAULT_FULL_NAME,
        email,
        phone,
        password: PASSWORD, // hashed by pre-save hook
        role: ROLE,
        isActive: true,
        loginAttempts: 0,
        lockUntil: null,
      });
      console.log(`New ${ROLE} user created.`);
    }

    console.log("Credentials summary:");
    console.log(`- Phone: ${RAW_PHONE} (stored as ${phone})`);
    console.log(`- Password: ${PASSWORD}`);
    console.log(`- Role: ${ROLE}`);
    console.log(`- User ID: ${user._id}`);
  } catch (error) {
    console.error("Failed to create/upgrade SUPER_ADMIN:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
};

run();
