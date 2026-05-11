import mongoose from "mongoose";
import dotenv from "dotenv";
import { SystemCounter } from "../models/SystemCounter.model.js";

dotenv.config();

const parseYearArg = () => {
  const raw = String(process.argv[2] || "").trim();
  if (!raw) return String(new Date().getFullYear());
  if (!/^\d{4}$/.test(raw)) {
    throw new Error("Year must be in YYYY format. Example: 2026");
  }
  return raw;
};

const run = async () => {
  const year = parseYearArg();
  const keys = [
    `loan_inquiry_application_code_${year}`,
    `loan_disbursement_reference_${year}`,
  ];

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in environment.");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const results = [];
  for (const key of keys) {
    const updated = await SystemCounter.findOneAndUpdate(
      { key },
      { $set: { value: 0 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    results.push({ key: updated.key, value: updated.value });
  }

  console.log(`Counters reset for year ${year}:`);
  results.forEach((item) => {
    console.log(`- ${item.key} => ${item.value}`);
  });

  await mongoose.connection.close();
};

run().catch(async (err) => {
  console.error("Failed to reset counters:", err.message);
  try {
    await mongoose.connection.close();
  } catch {
    // ignore close error
  }
  process.exit(1);
});

