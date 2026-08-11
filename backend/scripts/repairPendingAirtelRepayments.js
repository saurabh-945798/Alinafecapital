import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../config/config.js";
import { AirtelPayment } from "../models/AirtelPayment.model.js";
import { LoanAccount } from "../models/LoanAccount.model.js";
import { applyPaymentSummaryToDoc } from "../services/loanAccountSummary.service.js";

dotenv.config();

const isConfirmedPaid = (payment) => {
  const status = String(payment?.status || "").toUpperCase();
  if (status !== "PAID") return false;

  // A payment is considered verified only when status/callback data exists.
  // Initiation responses alone can say the API request was accepted, but that is
  // not proof that the customer approved the prompt and entered their PIN.
  return Boolean(payment?.statusResponse || payment?.callbackResponse);
};

const referenceCandidates = (payment) =>
  [payment?.airtelMoneyId, payment?.transactionId, payment?.reference]
    .filter(Boolean)
    .map((item) => String(item));

const shouldRemoveEntry = (entry, payment) => {
  const entryId = String(entry?._id || "");
  const recordedId = String(payment?.recordedRepaymentEntryId || "");
  if (recordedId && entryId === recordedId) return true;

  const refs = referenceCandidates(payment);
  const entryRef = String(entry?.reference || "");
  const entryNote = String(entry?.note || "");
  return refs.some((ref) => ref && (entryRef === ref || entryNote.includes(ref)));
};

const run = async () => {
  await connectDB();

  const affectedPayments = await AirtelPayment.find({
    $or: [
      { status: { $in: ["INITIATED", "PENDING", "FAILED", "CANCELLED", "UNKNOWN"] }, recordedRepaymentEntryId: { $ne: null } },
      { status: "PAID", recordedRepaymentEntryId: { $ne: null }, statusResponse: null, callbackResponse: null },
    ],
  });

  let repairedPayments = 0;
  let repairedAccounts = 0;
  let removedEntries = 0;

  for (const payment of affectedPayments) {
    if (isConfirmedPaid(payment)) continue;

    const account = await LoanAccount.findById(payment.accountId);
    if (account) {
      const before = Array.isArray(account.repaymentEntries) ? account.repaymentEntries.length : 0;
      account.repaymentEntries = (account.repaymentEntries || []).filter((entry) => !shouldRemoveEntry(entry, payment));
      const after = account.repaymentEntries.length;
      const removed = before - after;
      if (removed > 0) {
        removedEntries += removed;
        applyPaymentSummaryToDoc(account);
        await account.save();
        repairedAccounts += 1;
      }
    }

    payment.recordedRepaymentEntryId = null;
    payment.recordedAt = null;
    payment.paidAt = null;
    if (String(payment.status || "").toUpperCase() === "PAID") {
      payment.status = "PENDING";
      payment.gatewayMessage = payment.gatewayMessage || "Airtel Money request is awaiting customer approval.";
    }
    await payment.save();
    repairedPayments += 1;
  }

  console.table({ repairedPayments, repairedAccounts, removedEntries });
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Airtel repayment repair failed:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
