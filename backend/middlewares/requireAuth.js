import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { getUserRoles, selectPrimaryRole } from "../utils/rbac.js";

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!req.user.isActive) {
      return res.status(403).json({ success: false, message: "Account disabled", code: "ACCOUNT_DISABLED" });
    }

    const roles = getUserRoles(req.user);
    req.user.roles = roles.filter((role) => role !== "user");
    req.user.role = selectPrimaryRole(roles);

    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
};
