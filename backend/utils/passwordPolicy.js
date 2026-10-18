const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "qwerty",
  "qwerty123",
  "12345678",
  "123456789",
  "1234567890",
  "letmein",
  "welcome",
  "welcome123",
  "admin",
  "admin123",
  "alinafe",
  "alinafe123",
]);

const normalizeToken = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();

export const getPasswordPolicyChecks = (password = "", context = {}) => {
  const value = String(password || "");
  const lowered = value.toLowerCase();
  const emailLocal = String(context.email || "").split("@")[0] || "";
  const nameTokens = String(context.fullName || "")
    .split(/\s+/)
    .map(normalizeToken)
    .filter((token) => token.length >= 3);
  const emailToken = normalizeToken(emailLocal);
  const compactPassword = normalizeToken(value);

  const containsIdentity =
    (emailToken.length >= 3 && compactPassword.includes(emailToken)) ||
    nameTokens.some((token) => compactPassword.includes(token));

  return {
    minLength: value.length >= 12,
    uppercase: /[A-Z]/.test(value),
    lowercase: /[a-z]/.test(value),
    number: /\d/.test(value),
    special: /[^A-Za-z0-9]/.test(value),
    noIdentity: !containsIdentity,
    notCommon: !COMMON_PASSWORDS.has(lowered) && !COMMON_PASSWORDS.has(compactPassword),
  };
};

export const getPasswordPolicyErrors = (password = "", context = {}) => {
  const checks = getPasswordPolicyChecks(password, context);
  const errors = [];
  if (!checks.minLength) errors.push("Password must be at least 12 characters");
  if (!checks.uppercase) errors.push("Password must include an uppercase letter");
  if (!checks.lowercase) errors.push("Password must include a lowercase letter");
  if (!checks.number) errors.push("Password must include a number");
  if (!checks.special) errors.push("Password must include a special character");
  if (!checks.noIdentity) errors.push("Password must not contain your name or email");
  if (!checks.notCommon) errors.push("Password is too common or easy to guess");
  return errors;
};

export const isStrongPassword = (password = "", context = {}) =>
  getPasswordPolicyErrors(password, context).length === 0;
