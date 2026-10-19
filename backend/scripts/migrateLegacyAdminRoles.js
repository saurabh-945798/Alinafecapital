import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";
import { connectDB } from "../config/config.js";
import { getUserRoles, selectPrimaryRole } from "../utils/rbac.js";

dotenv.config();

const targetRole = String(process.env.LEGACY_ADMIN_FALLBACK_ROLE || "APPROVAL").trim().toUpperCase();

const run = async () => {
  await connectDB();
  const users = await User.find({
    $or: [
      { role: "admin" },
      { role: { $ne: "user" }, roles: { $in: [null, []] } },
      { role: { $ne: "user" }, roles: { $exists: false } },
    ],
  });

  let modified = 0;
  for (const user of users) {
    const currentRoles = getUserRoles(user).filter((role) => role !== "user" && role !== "ADMIN");
    const roles = currentRoles.length ? currentRoles : [targetRole];
    user.roles = roles;
    user.role = selectPrimaryRole(roles);
    user.refreshTokenHash = null;
    await user.save({ validateBeforeSave: true });
    modified += 1;
  }

  console.log(`Migrated legacy admin users to multi-role RBAC. Modified: ${modified}`);
  await mongoose.connection.close();
};

run().catch(async (error) => {
  console.error("Migration failed:", error);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
