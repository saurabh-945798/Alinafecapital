import { z } from "zod";

const money = z.number().nonnegative();
const months = z.number().int().min(1);

export const createLoanProductSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  category: z
    .enum([
      "Personal",
      "Private",
      "Business",
      "Agriculture",
      "Emergency Loan",
      "Government",
      "Public",
      "Education",
      "Group",
      "Asset Finance",
      "Digital Credit",
      "Other",
    ])
    .default("Private"),
  description: z.string().optional(),

  currency: z.string().default("MWK"),

  minAmount: money,
  maxAmount: money,
  minTenureMonths: months,
  maxTenureMonths: months,

  interestType: z.enum(["flat", "reducing"]).default("reducing"),
  interestRateMonthly: z.number().nonnegative(),

  processingFeeType: z.enum(["flat", "percent"]).default("percent"),
  processingFeeValue: z.number().nonnegative().default(2.5),
  adminFeeType: z.enum(["flat", "percent"]).default("percent"),
  adminFeeValue: z.number().nonnegative().default(2.5),
  overduePenaltyRatePercent: z.number().nonnegative().default(15),

  // Historical field accepted for backwards compatibility but no longer used for new recurring fees.
  loanAdministrationFeeMonthly: z.number().nonnegative().default(0),

  insuranceType: z.enum(["none", "flat", "percent"]).default("none"),
  insuranceValue: z.number().nonnegative().default(0),

  taxRatePercent: z.number().nonnegative().default(0),

  repaymentFrequency: z.enum(["monthly"]).default("monthly"),

  status: z.enum(["active", "inactive"]).default("active"),
  featured: z.boolean().default(false),
});

export const updateLoanProductSchema = createLoanProductSchema.partial();
