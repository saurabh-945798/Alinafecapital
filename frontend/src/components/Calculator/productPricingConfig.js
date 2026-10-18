export const LAST_UPDATED = "2026-09-12";

// Employment type is an eligibility/context input only. Pricing is sourced from the
// active backend Loan Product and is never altered by a browser-side rate table.
export const EMPLOYMENT_ADJUSTMENTS = {
  government: { label: "Govt Employee", rateDelta: 0 },
  private: { label: "Private Company Employee", rateDelta: 0 },
};
