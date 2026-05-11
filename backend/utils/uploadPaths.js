import path from "path";
import { UPLOAD_ROOT } from "../config/upload.js";

const normalizePath = (value = "") => String(value || "").replace(/\\/g, "/");
const isProd = String(process.env.NODE_ENV || "").trim().toLowerCase() === "production";
const traceUploads = String(process.env.UPLOAD_TRACE || "").trim() === "1";
const suspiciousLocalPattern = /(\\|\/)(users|onedrive|desktop|alinafecapital|backend|uploads)(\\|\/)/i;
const windowsDrivePattern = /^[a-zA-Z]:[\\/]/;

const throwIfUnsafeInProduction = (normalizedAbsolutePath) => {
  if (!isProd) return;
  if (windowsDrivePattern.test(normalizedAbsolutePath)) {
    throw new Error("Unsafe upload file path for production persistence (Windows drive path detected).");
  }
  if (suspiciousLocalPattern.test(normalizedAbsolutePath)) {
    throw new Error("Unsafe upload file path for production persistence (local dev path pattern detected).");
  }
};

export const toPersistedUploadPath = (filePath = "", context = "upload") => {
  const absolute = path.resolve(String(filePath || ""));
  const relative = path.relative(UPLOAD_ROOT, absolute);
  const normalizedAbsolute = normalizePath(absolute);
  const normalizedRelative = normalizePath(relative).replace(/^\/+/, "");

  if (!normalizedRelative || normalizedRelative.startsWith("..")) {
    throw new Error(`File path is outside UPLOAD_ROOT and cannot be persisted (${context}).`);
  }

  throwIfUnsafeInProduction(normalizedAbsolute);

  if (traceUploads) {
    console.info(`[upload-trace] context=${context} uploadRoot=${normalizePath(UPLOAD_ROOT)} rawPath=${String(filePath || "")} persistedPath=${normalizedAbsolute}`);
  }

  return normalizedAbsolute;
};

export const toPublicUploadUrl = (filePath = "") => {
  const absolute = path.resolve(String(filePath || ""));
  const relative = path.relative(UPLOAD_ROOT, absolute);
  const normalizedRelative = normalizePath(relative).replace(/^\/+/, "");

  if (!normalizedRelative || normalizedRelative.startsWith("..")) {
    throw new Error("File path is outside UPLOAD_ROOT and cannot be published.");
  }

  throwIfUnsafeInProduction(normalizePath(absolute));

  if (traceUploads) {
    console.info(`[upload-trace] context=public-url uploadRoot=${normalizePath(UPLOAD_ROOT)} absolute=${normalizePath(absolute)} url=/uploads/${normalizedRelative}`);
  }

  return `/uploads/${normalizedRelative}`;
};
