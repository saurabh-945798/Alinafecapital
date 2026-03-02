import { z } from "zod";

// Accept Malawi input variants:
// - 88XXXXXXX
// - 088XXXXXXX
// - +26588XXXXXXX
// - +265088XXXXXXX
const malawiPhoneInputRegex = /^(?:\+?2650?\d{9}|0?\d{9})$/;
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters"),
  email: z.string().trim().email("Invalid email format"),
  phone: z
    .string()
    .trim()
    .regex(
      malawiPhoneInputRegex,
      "Phone must be Malawi number format (e.g. 88XXXXXXX or +26588XXXXXXX)"
    ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      strongPasswordRegex,
      "Password must include uppercase, lowercase, and a number"
    ),
});

export const loginSchema = z.object({
  phone: z.string().trim().min(1, "Phone is required"),
  password: z.string().min(1, "Password is required"),
});
