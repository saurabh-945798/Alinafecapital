import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import fs from "fs";
import path from "path";

import { connectDB } from "./config/config.js";
import { getCorsOrigins, validateEnv } from "./config/env.js";
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
import adminInquiryRoutes from "./routes/admin.inquiry.routes.js";
import adminDashboardRoutes from "./routes/admin.dashboard.routes.js";
import adminAccountRoutes from "./routes/admin.account.routes.js";
import { UPLOAD_ROOT } from "./config/upload.js";
import { notFound } from "./middlewares/notFound.js";
import { errorHandler } from "./middlewares/errorHandler.js";

dotenv.config();
validateEnv();

const allowedOrigins = getCorsOrigins();

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS origin not allowed"));
  },
  credentials: true,
};

const app = express();
app.set("trust proxy", 1);

app.use(express.json());
app.use(cors(corsOptions));
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(morgan("dev"));

app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    const relativePath = decodeURIComponent(String(req.path || "")).replace(/^\/+/, "");
    const absolutePath = path.resolve(UPLOAD_ROOT, relativePath);

    if (!absolutePath.startsWith(UPLOAD_ROOT)) {
      return res.status(400).json({
        success: false,
        message: "Invalid upload path",
        data: null,
      });
    }

    if (fs.existsSync(absolutePath)) {
      return res.sendFile(absolutePath);
    }

    next();
  },
  express.static(UPLOAD_ROOT)
);

connectDB();

app.get("/", (req, res) => {
  res.json({ success: true, data: { message: "AlinafeCapital Backend Running" } });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/loan-products", loanProductRoutes);
app.use("/api/v1/calc", emiCalculatorRoutes);
app.use("/api/v1/applications", loanApplicationRoutes);
app.use("/api/v1/inquiries", inquiryRoutes);

app.use("/api/v1/admin", adminLoanProductRoutes);
app.use("/api/v1/admin", adminApplicationRoutes);
app.use("/api/v1/admin", adminKycRoutes);
app.use("/api/v1/admin", adminCustomerRoutes);
app.use("/api/v1/admin", adminInquiryRoutes);
app.use("/api/v1/admin", adminDashboardRoutes);
app.use("/api/v1/admin", adminAccountRoutes);

app.use("/api/v1/profile", profileRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT);
if (!Number.isFinite(PORT) || PORT <= 0) {
  throw new Error("Invalid PORT value");
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
