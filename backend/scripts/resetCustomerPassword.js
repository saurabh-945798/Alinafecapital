import dotenv from "dotenv";
import { connectDB } from "../config/config.js";
import User from "../models/User.js";
import { normalizeEmail, normalizePhone } from "../utils/normalize.js";

dotenv.config();

const args = process.argv.slice(2);

const readArg = (name) => {
  const prefix = `--${name}=`;
  const item = args.find((arg) => arg.startsWith(prefix));
  return item ? item.slice(prefix.length).trim() : "";
};

const emailArg = readArg("email");
const phoneArg = readArg("phone");
const newPassword = readArg("password");

if ((!emailArg && !phoneArg) || !newPassword) {
  console.error(`\nUsage:\n  npm run customer:reset-password -- --email=customer@example.com --password=NewPass123\n\nOr:\n  npm run customer:reset-password -- --phone=+265881234567 --password=NewPass123\n`);
  process.exit(1);
}

if (newPassword.length < 8) {
  console.error("Password must be at least 8 characters long.");
  process.exit(1);
}

try {
  await connectDB();

  const query = emailArg
    ? { email: normalizeEmail(emailArg) }
    : { phone: normalizePhone(phoneArg) };

  const user = await User.findOne(query);

  if (!user) {
    console.error("No customer/user account was found for the supplied email or phone.");
    process.exit(1);
  }

  user.password = newPassword;
  user.loginAttempts = 0;
  user.lockUntil = null;
  user.isActive = true;

  await user.save();

  console.log("Customer password reset successfully.");
  console.log(`Customer: ${user.fullName}`);
  console.log(`Email: ${user.email}`);
  console.log(`Phone: ${user.phone}`);
  console.log("The customer can now log in using the new password you supplied.");
  process.exit(0);
} catch (error) {
  console.error("Failed to reset customer password:", error?.message || error);
  process.exit(1);
}
