import crypto from "crypto";
import fs from "fs";
import path from "path";
import busboy from "busboy";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const uploadDirRaw = String(process.env.UPLOAD_DIR || "").trim();
const isProduction = String(process.env.NODE_ENV || "").trim().toLowerCase() === "production";

if (!uploadDirRaw && isProduction) {
  throw new Error("Missing UPLOAD_DIR. Set an absolute persistent upload directory in environment.");
}

const uploadRootResolved = uploadDirRaw ? path.resolve(uploadDirRaw) : path.resolve(PROJECT_ROOT, "uploads");
export const UPLOAD_ROOT = uploadRootResolved;
const MAX_SIZE_MB = Number(process.env.MAX_UPLOAD_MB || 6);

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true, mode: 0o750 });
};

ensureDir(UPLOAD_ROOT);
console.info(`[upload] Active upload root: ${UPLOAD_ROOT}`);
if (!uploadDirRaw && !isProduction) {
  console.warn(`[upload] UPLOAD_DIR not set. Using development fallback: ${UPLOAD_ROOT}`);
}

class UploadError extends Error {
  constructor(message, code = "UPLOAD_ERROR") {
    super(message);
    this.name = "MulterError";
    this.code = code;
  }
}

const sanitizeFileName = (name = "file") =>
  String(name || "file")
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 100) || "file";

const resolveUploadOwner = (req, fallback = "anonymous") => {
  const raw = String(req.uploadOwnerId || req.user?._id || fallback);
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || fallback;
};

const allowedMimes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const allowedDocExts = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp"]);
const allowedAvatarMimes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedAvatarExts = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const avatarExtByMime = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

const hasExpectedFileSignature = (filePath, mime) => {
  let buffer;
  try {
    const fd = fs.openSync(filePath, "r");
    buffer = Buffer.alloc(16);
    const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
    fs.closeSync(fd);
    buffer = buffer.subarray(0, bytesRead);
  } catch {
    return false;
  }

  const normalized = String(mime || "").toLowerCase();
  if (normalized === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (normalized === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (normalized === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  if (normalized === "image/webp") return buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
};

const safeDestination = (req, kind) => {
  const ownerId = resolveUploadOwner(req);
  const dest = path.resolve(UPLOAD_ROOT, kind, ownerId);
  const expectedRoot = path.resolve(UPLOAD_ROOT, kind) + path.sep;
  if (!dest.startsWith(expectedRoot)) throw new UploadError("Invalid upload destination");
  ensureDir(dest);
  return dest;
};

const validateFile = ({ originalname, mimetype, avatar = false }) => {
  const ext = path.extname(String(originalname || "")).toLowerCase();
  const mime = String(mimetype || "").toLowerCase();
  const mimeSet = avatar ? allowedAvatarMimes : allowedMimes;
  const extSet = avatar ? allowedAvatarExts : allowedDocExts;

  if (!mimeSet.has(mime) || !extSet.has(ext)) {
    throw new UploadError(
      avatar ? "Only JPG, JPEG, PNG, or WEBP images are allowed" : "Allowed formats: PDF, JPG, JPEG, PNG, WEBP",
      "LIMIT_UNEXPECTED_FILE"
    );
  }
};

const makeStoredName = ({ originalname, mimetype, avatar = false }) => {
  const originalExt = path.extname(String(originalname || ""));
  const ext = avatar ? avatarExtByMime[String(mimetype || "").toLowerCase()] || originalExt : originalExt.toLowerCase();
  const base = path.basename(String(originalname || "file"), originalExt);
  const prefix = avatar ? "avatar-" : "";
  return `${prefix}${Date.now()}-${crypto.randomBytes(8).toString("hex")}-${sanitizeFileName(base)}${ext}`;
};

const appendBodyField = (body, fieldname, value) => {
  if (!/^[a-zA-Z0-9_.-]{1,100}$/.test(fieldname)) {
    throw new UploadError("Invalid multipart field name", "INVALID_FIELD_NAME");
  }
  if (!(fieldname in body)) body[fieldname] = value;
  else if (Array.isArray(body[fieldname])) body[fieldname].push(value);
  else body[fieldname] = [body[fieldname], value];
};

const createUploadMiddleware = ({ avatar = false, kind = avatar ? "profile" : "kyc", fields = [] }) => {
  const allowedFields = new Map(fields.map((entry) => [entry.name, Math.max(1, Number(entry.maxCount || 1))]));
  const maxFiles = Math.max(1, [...allowedFields.values()].reduce((sum, count) => sum + count, 0));
  const maxBytes = (avatar ? 5 : MAX_SIZE_MB) * 1024 * 1024;

  return (req, res, next) => {
    if (!String(req.headers["content-type"] || "").toLowerCase().startsWith("multipart/form-data")) {
      return next(new UploadError("Expected multipart/form-data request", "INVALID_CONTENT_TYPE"));
    }

    req.body = req.body && typeof req.body === "object" ? req.body : {};
    req.files = {};
    req.file = undefined;

    let parser;
    try {
      parser = busboy({
        headers: req.headers,
        limits: {
          fileSize: maxBytes,
          files: maxFiles,
          fields: 80,
          parts: 100,
          fieldSize: 128 * 1024,
          headerPairs: 100,
        },
      });
    } catch (error) {
      return next(new UploadError(error?.message || "Malformed multipart request", "INVALID_MULTIPART"));
    }

    let terminalError = null;
    const writes = [];
    const counts = new Map();
    const createdFiles = new Set();

    const recordError = (error) => {
      if (!terminalError) terminalError = error instanceof Error ? error : new UploadError(String(error));
    };

    parser.on("field", (fieldname, value, info = {}) => {
      if (info.valueTruncated) {
        recordError(new UploadError("Multipart field is too large", "LIMIT_FIELD_VALUE"));
        return;
      }
      try {
        appendBodyField(req.body, fieldname, value);
      } catch (error) {
        recordError(error);
      }
    });

    parser.on("file", (fieldname, stream, info = {}) => {
      const { filename = "file", mimeType = "application/octet-stream", encoding = "7bit" } = info;
      const maxCount = allowedFields.get(fieldname);
      const nextCount = (counts.get(fieldname) || 0) + 1;
      counts.set(fieldname, nextCount);

      if (!maxCount || nextCount > maxCount) {
        recordError(new UploadError(`Unexpected file field: ${fieldname}`, "LIMIT_UNEXPECTED_FILE"));
        stream.resume();
        return;
      }

      try {
        validateFile({ originalname: filename, mimetype: mimeType, avatar });
      } catch (error) {
        recordError(error);
        stream.resume();
        return;
      }

      const destination = safeDestination(req, kind);
      const storedName = makeStoredName({ originalname: filename, mimetype: mimeType, avatar });
      const absolutePath = path.join(destination, storedName);
      createdFiles.add(absolutePath);

      let size = 0;
      let limited = false;
      stream.on("data", (chunk) => {
        size += chunk.length;
      });
      stream.on("limit", () => {
        limited = true;
        recordError(new UploadError("File too large", "LIMIT_FILE_SIZE"));
      });

      const writePromise = new Promise((resolve) => {
        const out = fs.createWriteStream(absolutePath, { flags: "wx", mode: 0o640 });
        out.on("error", (error) => {
          recordError(error);
          stream.resume();
          resolve();
        });
        out.on("finish", () => {
          if (limited || terminalError) {
            try { fs.unlinkSync(absolutePath); } catch {}
            createdFiles.delete(absolutePath);
            resolve();
            return;
          }

          if (!hasExpectedFileSignature(absolutePath, mimeType)) {
            recordError(new UploadError("File contents do not match the declared PDF/image format", "INVALID_FILE_SIGNATURE"));
            try { fs.unlinkSync(absolutePath); } catch {}
            createdFiles.delete(absolutePath);
            resolve();
            return;
          }

          const file = {
            fieldname,
            originalname: filename,
            encoding,
            mimetype: mimeType,
            destination,
            filename: storedName,
            path: absolutePath,
            size,
          };
          if (fields.length === 1 && maxCount === 1) req.file = file;
          if (!req.files[fieldname]) req.files[fieldname] = [];
          req.files[fieldname].push(file);
          resolve();
        });
        stream.pipe(out);
      });
      writes.push(writePromise);
    });

    parser.on("filesLimit", () => recordError(new UploadError("Too many files", "LIMIT_FILE_COUNT")));
    parser.on("fieldsLimit", () => recordError(new UploadError("Too many multipart fields", "LIMIT_FIELD_COUNT")));
    parser.on("partsLimit", () => recordError(new UploadError("Too many multipart parts", "LIMIT_PART_COUNT")));
    parser.on("error", (error) => recordError(new UploadError(error?.message || "Malformed multipart request", "INVALID_MULTIPART")));

    parser.on("close", async () => {
      await Promise.allSettled(writes);
      if (terminalError) {
        for (const filePath of createdFiles) {
          try { fs.unlinkSync(filePath); } catch {}
        }
        return next(terminalError);
      }
      return next();
    });

    req.pipe(parser);
  };
};

const uploader = ({ avatar = false, kind = avatar ? "profile" : "kyc" } = {}) => ({
  single(name) {
    return createUploadMiddleware({ avatar, kind, fields: [{ name, maxCount: 1 }] });
  },
  fields(fieldDefinitions) {
    const defs = Array.isArray(fieldDefinitions) ? fieldDefinitions : [];
    return createUploadMiddleware({ avatar, kind, fields: defs });
  },
});

export const upload = uploader();
export const uploadAvatar = uploader({ avatar: true, kind: "profile" });
export const uploadPayment = uploader({ kind: "payments" });
