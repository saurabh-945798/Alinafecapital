const PHONE_E164_REGEX = /^\+[1-9]\d{7,14}$/;

export const normalizeEmail = (email = "") => String(email).trim().toLowerCase();

export const normalizePhone = (phone = "") => {
  const raw = String(phone).trim();
  if (!raw) return "";

  const compact = raw.replace(/\s+/g, "");
  const hasPlus = compact.startsWith("+");
  const digitsOnly = compact.replace(/[^\d]/g, "");

  if (!digitsOnly) return "";

  // Already in +E.164 form
  if (hasPlus) {
    return `+${digitsOnly}`;
  }

  // Local Malawi number like 0881234567 -> +265881234567
  if (digitsOnly.startsWith("0") && digitsOnly.length >= 10) {
    return `+265${digitsOnly.slice(1)}`;
  }

  // Number includes country code without plus: 265881234567 -> +265881234567
  if (digitsOnly.startsWith("265")) {
    return `+${digitsOnly}`;
  }

  // Digits only local input in UI (e.g. 881234567) -> +265881234567
  return `+265${digitsOnly}`;
};

export const isValidE164Phone = (phone = "") => PHONE_E164_REGEX.test(String(phone));
