import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { normalizeRole } from "../utils/rbac.js";

/**
 * Optional authentication middleware.
 *
 * Use this on routes that can be submitted by guests, but should also be able
 * to recognise a logged-in customer when a valid Bearer token is provided.
 *
 * Important:
 * - Missing token: allow request to continue.
 * - Invalid/expired token: allow request to continue as guest.
 * - Valid active user: attach req.user for downstream controllers.
 */
export const optionalAuth = async (req, _res, next) => {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return next();
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (user && user.isActive) {
      user.role = normalizeRole(user.role);
      req.user = user;
    }
  } catch {
    // This middleware is intentionally optional. If the token is missing,
    // expired, or invalid, the request continues as a guest request.
  }

  return next();
};

export default optionalAuth;
