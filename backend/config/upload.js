import fs from "fs";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const uploadDirRaw = String(process.env.UPLOAD_DIR || "").trim();
const isProduction = String(process.env.NODE_ENV || "").trim().toLowerCase() === "production";

if (!uploadDirRaw && isProduction) {
  throw new Error("Missing UPLOAD_DIR. Set an absolute persistent upload directory in environment.");
}

const uploadRootResolved = uploadDirRaw
  ? path.resolve(uploadDirRaw)
  : path.resolve(PROJECT_ROOT, "uploads");

export const UPLOAD_ROOT = uploadRootResolved;
const MAX_SIZE_MB = Number(process.env.MAX_UPLOAD_MB || 6);

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

ensureDir(UPLOAD_ROOT);
console.info(`[upload] Active upload root: ${UPLOAD_ROOT}`);

if (!uploadDirRaw && !isProduction) {
  console.warn(`[upload] UPLOAD_DIR not set. Using development fallback: ${UPLOAD_ROOT}`);
}

const sanitizeFileName = (name = "file") =>
  name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);

const resolveUploadOwner = (req, fallback = "anonymous") =>
  String(req.uploadOwnerId || req.user?._id || fallback);

const allowedMimes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
]);
const allowedAvatarMimes = new Set(["image/jpeg", "image/png", "image/webp"]);
const avatarExtByMime = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const ownerId = resolveUploadOwner(req);
      const dest = path.join(UPLOAD_ROOT, "kyc", ownerId);
      ensureDir(dest);
      cb(null, dest);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const base = path.basename(file.originalname || "file", ext);
    const safeBase = sanitizeFileName(base);
    const stamp = Date.now();
    cb(null, `${stamp}-${safeBase}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = String(path.extname(file.originalname || "") || "").toLowerCase();
  const allowedExts = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp"]);
  const mime = String(file.mimetype || "").toLowerCase();
  const isOctetStream = mime === "application/octet-stream";
  const allowedByMime = allowedMimes.has(mime);
  const allowedByExt = allowedExts.has(ext);

  if (!allowedByMime && !(isOctetStream && allowedByExt)) {
    return cb(new Error("Allowed formats: PDF, JPG, JPEG, PNG, WEBP"));
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_SIZE_MB * 1024 * 1024,
  },
});

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const ownerId = resolveUploadOwner(req);
      const dest = path.join(UPLOAD_ROOT, "profile", ownerId);
      ensureDir(dest);
      cb(null, dest);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const ext = avatarExtByMime[file.mimetype] || path.extname(file.originalname || "");
    const base = path.basename(file.originalname || "avatar", ext);
    const safeBase = sanitizeFileName(base || "avatar");
    const stamp = Date.now();
    cb(null, `avatar-${stamp}-${safeBase}${ext}`);
  },
});

const avatarFilter = (req, file, cb) => {
  if (!allowedAvatarMimes.has(file.mimetype)) {
    return cb(new Error("Only JPG, PNG, or WEBP images are allowed"));
  }
  cb(null, true);
};

export const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: avatarFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});
