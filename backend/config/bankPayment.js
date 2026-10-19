export const BANK_PAYMENT_DETAILS = Object.freeze({
  bankName: String(process.env.BANK_PAYMENT_BANK_NAME || "National Bank").trim(),
  accountNumber: String(process.env.BANK_PAYMENT_ACCOUNT_NUMBER || "1006477832").trim(),
  accountName: String(process.env.BANK_PAYMENT_ACCOUNT_NAME || "Alinafe Online Limited").trim(),
});
