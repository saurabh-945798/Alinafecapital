const requiredSmtpConfig = () => {
  const host = String(process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || 0);
  const user = String(process.env.SMTP_USER || "").trim();
  const password = String(process.env.SMTP_PASSWORD || "");
  const from = String(process.env.SMTP_FROM || "").trim();
  const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true";

  if (!host || !Number.isFinite(port) || port <= 0 || !user || !password || !from) {
    const error = new Error("Password reset email service is not configured");
    error.code = "EMAIL_NOT_CONFIGURED";
    throw error;
  }

  return { host, port, user, password, from, secure };
};

let transporterPromise = null;

const getTransporter = async () => {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      const config = requiredSmtpConfig();
      let nodemailer;
      try {
        const mod = await import("nodemailer");
        nodemailer = mod.default || mod;
      } catch (error) {
        const wrapped = new Error("Password reset email dependency is unavailable");
        wrapped.code = "EMAIL_DEPENDENCY_UNAVAILABLE";
        wrapped.cause = error;
        throw wrapped;
      }
      return {
        transporter: nodemailer.createTransport({
          host: config.host,
          port: config.port,
          secure: config.secure,
          auth: { user: config.user, pass: config.password },
        }),
        from: config.from,
      };
    })().catch((error) => {
      transporterPromise = null;
      throw error;
    });
  }
  return transporterPromise;
};

export const assertPasswordResetEmailReady = () => requiredSmtpConfig();

export const sendPasswordResetEmail = async ({ to, fullName = "Customer", resetUrl, expiresMinutes = 15 }) => {
  const { transporter, from } = await getTransporter();
  const safeName = String(fullName || "Customer").trim() || "Customer";

  await transporter.sendMail({
    from,
    to,
    subject: "Reset your Alinafe Capital password",
    text: [
      `Hello ${safeName},`,
      "",
      "We received a request to reset your Alinafe Capital customer password.",
      `Use this secure link within ${expiresMinutes} minutes:`,
      resetUrl,
      "",
      "If you did not request this reset, you can ignore this email.",
      "This link can only be used once.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <p>Hello ${safeName.replace(/[<>&"]/g, "")},</p>
        <p>We received a request to reset your Alinafe Capital customer password.</p>
        <p><a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#002D5B;color:#fff;text-decoration:none;border-radius:8px">Reset password</a></p>
        <p>This link expires in ${expiresMinutes} minutes and can only be used once.</p>
        <p>If you did not request this reset, you can ignore this email.</p>
      </div>`,
  });
};
