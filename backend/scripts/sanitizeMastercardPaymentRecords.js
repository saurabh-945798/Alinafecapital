import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/config.js";
import { MastercardPayment } from "../models/MastercardPayment.model.js";
import { buildGatewayStorageSnapshot, sanitizeForLog } from "../utils/paymentSecurity.js";

const sanitizeRecords = async () => {
  await connectDB();

  const cursor = MastercardPayment.find({}).cursor();
  let checked = 0;
  let updated = 0;

  for await (const payment of cursor) {
    checked += 1;
    payment.createdPayload = sanitizeForLog(payment.createdPayload);
    payment.createSessionResponse = buildGatewayStorageSnapshot(payment.createSessionResponse) || sanitizeForLog(payment.createSessionResponse);
    payment.payResponse = buildGatewayStorageSnapshot(payment.payResponse) || sanitizeForLog(payment.payResponse);
    payment.orderStatusResponse = buildGatewayStorageSnapshot(payment.orderStatusResponse) || sanitizeForLog(payment.orderStatusResponse);
    await payment.save();
    updated += 1;
  }

  console.log(`Mastercard payment records checked: ${checked}`);
  console.log(`Mastercard payment records sanitized: ${updated}`);
};

sanitizeRecords()
  .catch((error) => {
    console.error("Mastercard payment record sanitization failed:", sanitizeForLog(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
