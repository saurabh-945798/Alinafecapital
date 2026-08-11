import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/config.js";
import { LoanAccount } from "../models/LoanAccount.model.js";
import { enrichLoanAccount } from "../services/loanAccountSummary.service.js";

const round = (value) => Math.round(Number(value || 0) * 100) / 100;
const money = (value, currency = "MWK") => `${currency} ${round(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

try {
  await connectDB();
  const accounts = await LoanAccount.find({}).sort({ createdAt: 1 }).lean();
  const rows = [];
  const issues = [];

  for (const account of accounts) {
    const enriched = enrichLoanAccount(account);
    const schedule = Array.isArray(enriched.schedule) ? enriched.schedule : [];
    const unpaid = schedule.filter((row) => String(row.paymentStatus || "").toLowerCase() !== "paid");
    const sumRemaining = round(unpaid.reduce((sum, row) => sum + Number(row.remainingAmount || 0), 0));
    const outstanding = round(enriched.outstandingBalance || 0);
    const next = unpaid[0] || null;
    const diff = round(Math.abs(sumRemaining - outstanding));

    rows.push({
      account: enriched.accountNumber,
      customer: enriched.customerName,
      totalRepayment: money(enriched.totalRepayment, enriched.currency || "MWK"),
      paid: money(enriched.totalPaidAmount, enriched.currency || "MWK"),
      outstanding: money(outstanding, enriched.currency || "MWK"),
      sumRemaining: money(sumRemaining, enriched.currency || "MWK"),
      nextAmount: money(next?.remainingAmount || 0, enriched.currency || "MWK"),
      remainingInstallments: unpaid.length,
      status: enriched.status,
    });

    if (diff > 1) {
      issues.push(`${enriched.accountNumber}: outstanding ${outstanding} does not match schedule remaining ${sumRemaining}`);
    }
  }

  console.table(rows);
  if (issues.length) {
    console.warn("Schedule audit issues:");
    issues.forEach((item) => console.warn(`- ${item}`));
    process.exitCode = 1;
  } else {
    console.log("Repayment schedule audit passed. Outstanding balances match the unpaid schedule amounts.");
  }
  await mongoose.disconnect();
} catch (error) {
  console.error("Repayment schedule audit failed:");
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
}
