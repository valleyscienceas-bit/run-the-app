import type { Firestore } from "firebase-admin/firestore";

export type HealthCheckName = "server" | "firestore" | "smtp" | "ai";

export type HealthCheckResult = {
  ok: boolean;
  message?: string;
};

export type HealthResponse = {
  ok: boolean;
  checks: Record<HealthCheckName, HealthCheckResult>;
  timestamp: string;
};

export function checkSmtpEnv(env: NodeJS.ProcessEnv = process.env): HealthCheckResult {
  const hasUser = Boolean(env.SMTP_USER?.trim());
  if (!hasUser) {
    return { ok: true, message: "not configured (optional)" };
  }

  const hasAuth = Boolean(env.SMTP_PASS?.trim());
  const hasHost = Boolean(env.SMTP_HOST?.trim() || env.SMTP_SERVICE?.trim());
  if (!hasAuth || !hasHost) {
    return {
      ok: false,
      message: "SMTP_USER set but missing SMTP_PASS or SMTP_HOST/SMTP_SERVICE",
    };
  }

  return { ok: true, message: "configured" };
}

export function checkAiEnv(env: NodeJS.ProcessEnv = process.env): HealthCheckResult {
  const provider = (env.AI_PROVIDER || "auto").trim().toLowerCase();
  const hasLocal = Boolean(env.LOCAL_LLM_BASE_URL?.trim());
  const hasGemini = Boolean(env.GEMINI_API_KEY?.trim());
  const hasOpenRouter = Boolean(env.OPENROUTER_API_KEY?.trim());

  if (provider === "local" || (provider === "auto" && hasLocal)) {
    const model = env.LOCAL_LLM_MODEL?.trim() || "phi-4-mini-instruct";
    return { ok: true, message: `local configured (${model})` };
  }
  if (hasGemini) {
    return { ok: true, message: "gemini configured" };
  }
  if (hasOpenRouter) {
    return { ok: true, message: "openrouter configured" };
  }

  return { ok: true, message: "not configured (optional)" };
}

export async function checkFirestore(db: Firestore): Promise<HealthCheckResult> {
  try {
    await db.listCollections();
    return { ok: true, message: "reachable" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, message };
  }
}

export async function runHealthChecks(
  db: Firestore,
  env: NodeJS.ProcessEnv = process.env
): Promise<HealthResponse> {
  const firestore = await checkFirestore(db);
  const smtp = checkSmtpEnv(env);
  const ai = checkAiEnv(env);
  const checks: Record<HealthCheckName, HealthCheckResult> = {
    server: { ok: true, message: "up" },
    firestore,
    smtp,
    ai,
  };

  const ok = checks.server.ok && checks.firestore.ok && checks.smtp.ok;

  return {
    ok,
    checks,
    timestamp: new Date().toISOString(),
  };
}

export function formatHealthAlertBody(health: HealthResponse, baseUrl: string): { text: string; html: string } {
  const failed = Object.entries(health.checks)
    .filter(([, check]) => !check.ok)
    .map(([name, check]) => `${name}: ${check.message || "failed"}`)
    .join("\n");

  const text = [
    "Valley Science health check failed.",
    "",
    `Time: ${health.timestamp}`,
    `URL: ${baseUrl}/api/health`,
    "",
    "Failed checks:",
    failed || "(none — unexpected)",
  ].join("\n");

  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #fecaca; border-radius: 10px; background: #fef2f2;">
      <h2 style="color: #991b1b;">Valley Science — Health Check Failed</h2>
      <p><strong>Time:</strong> ${health.timestamp}</p>
      <p><strong>Endpoint:</strong> <a href="${baseUrl}/api/health">${baseUrl}/api/health</a></p>
      <pre style="background: #fff; padding: 12px; border-radius: 6px; color: #7f1d1d;">${failed || "(none)"}</pre>
    </div>
  `;

  return { text, html };
}
