import { z } from "zod";
import { getPasswordPolicyErrors } from "../passwordPolicy.js";

// Accept Malawi input variants:
// - 88XXXXXXX
// - 088XXXXXXX
// - +26588XXXXXXX
// - +265088XXXXXXX
const malawiPhoneInputRegex = /^(?:\+?2650?\d{9}|0?\d{9})$/;

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Full name must be at least 2 characters"),
    email: z.string().trim().email("Invalid email format"),
    phone: z
      .string()
      .trim()
      .regex(
        malawiPhoneInputRegex,
        "Phone must be Malawi number format (e.g. 88XXXXXXX or +26588XXXXXXX)"
      ),
    password: z.string().min(1, "Password is required"),
  })
  .superRefine((data, ctx) => {
    const errors = getPasswordPolicyErrors(data.password, {
      fullName: data.fullName,
      email: data.email,
    });
    errors.forEach((message) =>
      ctx.addIssue({ code: "custom", path: ["password"], message })
    );
  });

export const loginSchema = z
  .object({
    loginId: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    email: z.string().trim().optional(),
    password: z.string().min(1, "Password is required"),
  })
  .superRefine((data, ctx) => {
    const hasLoginId = !!String(data.loginId || "").trim();
    const hasPhone = !!String(data.phone || "").trim();
    const hasEmail = !!String(data.email || "").trim();

    if (!hasLoginId && !hasPhone && !hasEmail) {
      ctx.addIssue({
        code: "custom",
        path: ["loginId"],
        message: "Email or phone is required",
      });
    }
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(32, "Invalid or expired reset link"),
    password: z.string().min(1, "Password is required"),
    confirmPassword: z.string().min(1, "Please confirm your password").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.confirmPassword !== undefined && data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
  });
