import { describe, expect, it, vi } from "vitest";
import { checkAiEnv, checkSmtpEnv, formatHealthAlertBody, runHealthChecks } from "./health.js";

describe("checkSmtpEnv", () => {
  it("treats missing SMTP as optional ok", () => {
    expect(checkSmtpEnv({})).toEqual({ ok: true, message: "not configured (optional)" });
  });

  it("fails when SMTP is partially configured", () => {
    const result = checkSmtpEnv({ SMTP_USER: "user@example.com" });
    expect(result.ok).toBe(false);
  });

  it("passes when SMTP is fully configured", () => {
    const result = checkSmtpEnv({
      SMTP_USER: "user@example.com",
      SMTP_PASS: "secret",
      SMTP_HOST: "smtp.example.com",
    });
    expect(result.ok).toBe(true);
    expect(result.message).toBe("configured");
  });
});

describe("checkAiEnv", () => {
  it("reports optional when no keys are set", () => {
    expect(checkAiEnv({})).toEqual({ ok: true, message: "not configured (optional)" });
  });

  it("detects gemini key", () => {
    expect(checkAiEnv({ GEMINI_API_KEY: "abc" }).message).toBe("gemini configured");
  });

  it("detects local LM Studio config", () => {
    expect(
      checkAiEnv({
        AI_PROVIDER: "local",
        LOCAL_LLM_BASE_URL: "http://127.0.0.1:1234/v1",
        LOCAL_LLM_MODEL: "phi-4-mini-instruct",
      }).message
    ).toContain("local configured");
  });
});

describe("runHealthChecks", () => {
  it("aggregates check results", async () => {
    const db = {
      listCollections: vi.fn().mockResolvedValue([]),
    };

    const health = await runHealthChecks(db as never, {
      SMTP_USER: "u@e.com",
      SMTP_PASS: "p",
      SMTP_HOST: "smtp.e.com",
    });

    expect(health.ok).toBe(true);
    expect(health.checks.server.ok).toBe(true);
    expect(health.checks.firestore.ok).toBe(true);
    expect(health.timestamp).toBeTruthy();
  });

  it("marks health unhealthy when firestore fails", async () => {
    const db = {
      listCollections: vi.fn().mockRejectedValue(new Error("permission denied")),
    };

    const health = await runHealthChecks(db as never, {});
    expect(health.ok).toBe(false);
    expect(health.checks.firestore.ok).toBe(false);
  });
});

describe("formatHealthAlertBody", () => {
  it("includes failed check names", () => {
    const health = {
      ok: false,
      timestamp: "2026-01-01T00:00:00.000Z",
      checks: {
        server: { ok: true },
        firestore: { ok: false, message: "timeout" },
        smtp: { ok: true },
        ai: { ok: true },
      },
    };

    const { text } = formatHealthAlertBody(health as never, "https://app.example.com");
    expect(text).toContain("firestore: timeout");
  });
});
