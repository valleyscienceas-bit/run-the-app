import fs from "fs";
import path from "path";

export type EnvValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export function validateEnv(options?: {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}): EnvValidationResult {
  const cwd = options?.cwd ?? process.cwd();
  const env = options?.env ?? process.env;
  const errors: string[] = [];
  const warnings: string[] = [];

  const firebaseConfigFile = path.join(cwd, "firebase-applet-config.json");
  if (!fs.existsSync(firebaseConfigFile)) {
    errors.push("Missing firebase-applet-config.json (Firebase project config)");
  } else {
    try {
      const config = JSON.parse(fs.readFileSync(firebaseConfigFile, "utf8"));
      if (!config.projectId) {
        errors.push("firebase-applet-config.json is missing projectId");
      }
    } catch {
      errors.push("firebase-applet-config.json is invalid JSON");
    }
  }

  const credPath = env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (credPath) {
    if (!fs.existsSync(credPath)) {
      errors.push(`GOOGLE_APPLICATION_CREDENTIALS points to missing file: ${credPath}`);
    }
  } else if (env.NODE_ENV === "production") {
    warnings.push(
      "GOOGLE_APPLICATION_CREDENTIALS not set — using Application Default Credentials (expected on GCP)"
    );
  } else {
    warnings.push(
      "GOOGLE_APPLICATION_CREDENTIALS not set — ensure Application Default Credentials are available for Firestore"
    );
  }

  const smtpUser = env.SMTP_USER?.trim();
  const smtpPass = env.SMTP_PASS?.trim();
  const smtpHost = env.SMTP_HOST?.trim();
  const smtpService = env.SMTP_SERVICE?.trim();
  if (smtpUser) {
    if (!smtpPass || (!smtpHost && !smtpService)) {
      warnings.push(
        "Incomplete SMTP config — SMTP_USER is set but SMTP_PASS or SMTP_HOST/SMTP_SERVICE is missing"
      );
    }
  } else {
    warnings.push("SMTP not configured — emails will be simulated (logged only)");
  }

  if (!env.GEMINI_API_KEY?.trim() && !env.OPENROUTER_API_KEY?.trim()) {
    warnings.push("No AI API key (GEMINI_API_KEY or OPENROUTER_API_KEY) — Socratic chat will fail");
  }

  if (!env.CRON_SECRET?.trim()) {
    warnings.push("CRON_SECRET not set — /api/cron/* endpoints will reject requests");
  }

  if (!env.ADMIN_EMAIL?.trim() && !smtpUser) {
    warnings.push("ADMIN_EMAIL not set — health alerts will use SMTP_USER or built-in fallback");
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function logEnvValidation(result: EnvValidationResult): void {
  for (const warning of result.warnings) {
    console.warn(`[ENV] Warning: ${warning}`);
  }
  for (const error of result.errors) {
    console.error(`[ENV] Error: ${error}`);
  }
}
