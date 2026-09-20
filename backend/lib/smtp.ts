import type { Transporter } from "nodemailer";
import nodemailer from "nodemailer";

export type SmtpConfig = {
  user: string;
  pass: string;
  service?: string;
  host?: string;
  port: number;
  secure: boolean;
};

/** Normalize Gmail app passwords (Google often shows them with spaces). */
export function normalizeSmtpPass(pass: string | undefined): string {
  return (pass || "").replace(/\s+/g, "").trim();
}

export function readSmtpConfig(env: NodeJS.ProcessEnv = process.env): SmtpConfig | null {
  const user = env.SMTP_USER?.trim();
  if (!user) return null;

  const pass = normalizeSmtpPass(env.SMTP_PASS);
  if (!pass) return null;

  const service = env.SMTP_SERVICE?.trim() || undefined;
  const host = env.SMTP_HOST?.trim() || undefined;
  const port = Number(env.SMTP_PORT) || (service === "gmail" ? 587 : 587);
  const secure =
    env.SMTP_SECURE === "true" ||
    Number(env.SMTP_PORT) === 465;

  return { user, pass, service, host, port, secure };
}

/**
 * Build a nodemailer transport.
 * For Gmail: use `service: "gmail"` alone (do not also force ethereal host).
 * Regular Gmail passwords will fail — use a 16-character App Password.
 */
export function createMailTransporter(
  config: SmtpConfig,
  createTransport: typeof nodemailer.createTransport = nodemailer.createTransport
): Transporter {
  const isGmail =
    (config.service || "").toLowerCase() === "gmail" ||
    (config.host || "").includes("gmail.com") ||
    config.user.toLowerCase().endsWith("@gmail.com");

  if (isGmail) {
    return createTransport({
      service: "gmail",
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }

  return createTransport({
    ...(config.service ? { service: config.service } : {}),
    host: config.host || "smtp.ethereal.email",
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: { rejectUnauthorized: false },
  });
}

export function explainSmtpFailure(errorMessage: string): string {
  const msg = errorMessage || "Unknown email error";
  if (/535|BadCredentials|Username and Password not accepted/i.test(msg)) {
    return (
      "Gmail rejected the SMTP login (535 BadCredentials). " +
      "Use a Google App Password (not your normal Gmail password): " +
      "Google Account → Security → 2-Step Verification → App passwords → " +
      "create one for Mail, then set SMTP_PASS in backend/.env to that 16-character code " +
      "(no spaces) and restart the backend. See docs/email-setup.md."
    );
  }
  if (/EAUTH|Invalid login/i.test(msg)) {
    return (
      "SMTP login failed. Check SMTP_USER / SMTP_PASS in backend/.env. " +
      "For Gmail you must use an App Password. See docs/email-setup.md."
    );
  }
  return `Email send failed: ${msg}`;
}
