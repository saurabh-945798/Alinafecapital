import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import fs from "fs";
import path from "path";

import { connectDB } from "./config/config.js";
import { getCorsOrigins, normalizeCorsOrigin, validateEnv } from "./config/env.js";
import loanProductRoutes from "./routes/loanProduct.routes.js";
import adminLoanProductRoutes from "./routes/admin.loanProduct.routes.js";
import emiCalculatorRoutes from "./routes/emiCalculator.routes.js";
import loanApplicationRoutes from "./routes/loanApplication.routes.js";
import adminApplicationRoutes from "./routes/admin.application.routes.js";
import authRoutes from "./routes/auth.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import adminKycRoutes from "./routes/admin.kyc.routes.js";
import adminCustomerRoutes from "./routes/admin.customer.routes.js";
import inquiryRoutes from "./routes/inquiry.routes.js";
import complaintRoutes from "./routes/complaint.routes.js";
import adminInquiryRoutes from "./routes/admin.inquiry.routes.js";
import adminDashboardRoutes from "./routes/admin.dashboard.routes.js";
import adminAnalyticsRoutes from "./routes/admin.analytics.routes.js";
import adminAccountRoutes from "./routes/admin.account.routes.js";
import adminComplaintRoutes from "./routes/admin.complaint.routes.js";
import adminUserRoutes from "./routes/admin.user.routes.js";
import customerLoanAccountRoutes from "./routes/customer.loanAccount.routes.js";
import mastercardRepaymentRoutes from "./routes/mastercardRepayment.routes.js";
import airtelRepaymentRoutes from "./routes/airtelRepayment.routes.js";
import protectedFileRoutes from "./routes/protectedFile.routes.js";
import adminRiskRoutes from "./routes/admin.risk.routes.js";
import bankPaymentRoutes from "./routes/bankPayment.routes.js";
import adminBankPaymentRoutes from "./routes/admin.bankPayment.routes.js";
import adminFinanceRoutes from "./routes/admin.finance.routes.js";
import { UPLOAD_ROOT } from "./config/upload.js";
import { notFound } from "./middlewares/notFound.js";
import { errorHandler } from "./middlewares/errorHandler.js";

validateEnv();

const allowedOrigins = getCorsOrigins();

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(normalizeCorsOrigin(origin))) return callback(null, true);
    return callback(new Error("CORS origin not allowed"));
  },
  credentials: true,
};

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(cors(corsOptions));
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return cors(corsOptions)(req, res, next);
  }
  return next();
});
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "1mb" }));
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    const safeUrl = String(req.originalUrl || req.url || "/").replace(/[\r\n\u2028\u2029]/g, "_");
    console.info(`[http] ${req.method} ${safeUrl} ${res.statusCode} ${Date.now() - startedAt}ms`);
  });
  next();
});

app.use(
  "/uploads/profile",
  (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cache-Control", "private, max-age=300");
    next();
  },
  express.static(path.join(UPLOAD_ROOT, "profile"), { dotfiles: "deny", fallthrough: true })
);

app.get("/", (req, res) => {
  res.json({ success: true, data: { message: "AlinafeCapital Backend Running" } });
});

app.get("/uploads/kyc/:owner/:filename", (req, res) => res.redirect(307, `/api/v1/files/kyc/${encodeURIComponent(req.params.owner)}/${encodeURIComponent(req.params.filename)}`));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/files", protectedFileRoutes);
app.use("/api/v1/loan-products", loanProductRoutes);
app.use("/api/v1/calc", emiCalculatorRoutes);
app.use("/api/v1/applications", loanApplicationRoutes);
app.use("/api/v1/inquiries", inquiryRoutes);
app.use("/api/v1/complaints", complaintRoutes);
app.use("/api/v1/accounts", customerLoanAccountRoutes);
app.use("/api/v1/payments", mastercardRepaymentRoutes);
app.use("/api/v1/payments", airtelRepaymentRoutes);
app.use("/api/v1/payments", bankPaymentRoutes);

app.use("/api/v1/admin", adminLoanProductRoutes);
app.use("/api/v1/admin", adminApplicationRoutes);
app.use("/api/v1/admin", adminKycRoutes);
app.use("/api/v1/admin", adminCustomerRoutes);
app.use("/api/v1/admin", adminInquiryRoutes);
app.use("/api/v1/admin", adminDashboardRoutes);
app.use("/api/v1/admin", adminAnalyticsRoutes);
app.use("/api/v1/admin", adminAccountRoutes);
app.use("/api/v1/admin", adminComplaintRoutes);
app.use("/api/v1/admin", adminUserRoutes);
app.use("/api/v1/admin", adminRiskRoutes);
app.use("/api/v1/admin", adminBankPaymentRoutes);
app.use("/api/v1/admin", adminFinanceRoutes);

app.use("/api/v1/profile", profileRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT);
if (!Number.isFinite(PORT) || PORT <= 0) {
  throw new Error("Invalid PORT value");
}

try {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} catch (error) {
  console.error("Failed to start server because MongoDB connection failed:");
  console.error(error);
  process.exit(1);
}


