import { z } from "zod";

export const createLoanApplicationSchema = z.object({
  productSlug: z.string().min(2),
  fullName: z.string().min(2),
  phone: z.string().min(7),
  email: z.string().email().optional().or(z.literal("")),
  monthlyIncome: z.number().nonnegative().optional(),

  amount: z.number().positive(),
  tenureMonths: z.number().int().min(1),
});
