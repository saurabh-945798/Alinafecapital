import { ApiError } from "../utils/ApiError.js";

export const adminKeyAuth = (req, res, next) => {
  const key = req.headers["x-admin-key"];
  if (!process.env.ADMIN_API_KEY) {
    return next(new ApiError(500, "ADMIN_API_KEY missing in env", "ENV_MISSING"));
  }
  if (!key || key !== process.env.ADMIN_API_KEY) {
    return next(new ApiError(401, "Unauthorized (missing/invalid admin key)", "UNAUTHORIZED"));
  }
  next();
};