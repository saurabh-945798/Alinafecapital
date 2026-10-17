import "dotenv/config";
import { connectDB } from "../config/config.js";
import User from "../models/User.js";
import { syncLatestInquiryToCustomerProfile } from "../services/customerAccountLink.service.js";

try {
  await connectDB();
  const users = await User.find({ role: "user" }).select("_id fullName email phone role isActive");
  let synced = 0;

  for (const user of users) {
    const profile = await syncLatestInquiryToCustomerProfile(user);
    if (profile) synced += 1;
  }

  console.log(`Customer KYC sync completed. Users checked: ${users.length}. Profiles synced: ${synced}.`);
  process.exit(0);
} catch (error) {
  console.error("Customer KYC sync failed:");
  console.error(error);
  process.exit(1);
}
