import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ADMIN_DB_ROLE_VALUES, normalizeRoles, selectPrimaryRole } from "../utils/rbac.js";

const USER_ROLES = ["user", ...ADMIN_DB_ROLE_VALUES];

const UserSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      sparse: false,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      sparse: false,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 12,
    },

    role: {
      type: String,
      enum: USER_ROLES,
      default: "user",
    },

    // Multi-role RBAC for staff. `role` is retained as a backwards-compatible
    // primary role while `roles` is the authoritative set for admin access.
    roles: {
      type: [{ type: String, enum: USER_ROLES }],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    loginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
      default: null,
    },

    refreshTokenHash: {
      type: String,
      default: null,
      select: false,
    },
  },
  { timestamps: true }
);

UserSchema.index({ lockUntil: 1 });


UserSchema.pre("validate", function () {
  const current = normalizeRoles({ role: this.role, roles: this.roles });
  if (!current.length || (current.length === 1 && current[0] === "user")) {
    this.role = "user";
    this.roles = [];
    return;
  }
  const adminRoles = current.filter((role) => role !== "user");
  this.roles = adminRoles;
  this.role = selectPrimaryRole(adminRoles);
});

// Hash password
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", UserSchema);
