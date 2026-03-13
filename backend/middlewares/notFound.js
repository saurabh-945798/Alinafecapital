import fs from "fs";
import path from "path";
import { ApiResponse } from "../utils/ApiResponse.js";
import { UPLOAD_ROOT } from "../config/upload.js";

export const notFound = (req, res) => {
  if (req.originalUrl.startsWith("/uploads/")) {
    const relativePath = decodeURIComponent(req.originalUrl)
      .replace(/^\/uploads\/+/, "")
      .split("?")[0];
    const absolutePath = path.resolve(UPLOAD_ROOT, relativePath);

    if (absolutePath.startsWith(UPLOAD_ROOT) && fs.existsSync(absolutePath)) {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      return res.sendFile(absolutePath);
    }
  }

  res.status(404).json(
    new ApiResponse({
      success: false,
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      data: null,
    })
  );
};
