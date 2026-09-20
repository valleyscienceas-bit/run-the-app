import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { validateEnv } from "./env.js";

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vs-env-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("validateEnv", () => {
  it("passes with valid firebase config and credentials path", () => {
    const cwd = makeTempDir();
    fs.writeFileSync(
      path.join(cwd, "firebase-applet-config.json"),
      JSON.stringify({ projectId: "test-project" })
    );
    const credFile = path.join(cwd, "service-account.json");
    fs.writeFileSync(credFile, "{}");

    const result = validateEnv({
      cwd,
      env: {
        GOOGLE_APPLICATION_CREDENTIALS: credFile,
        SMTP_USER: "user@example.com",
        SMTP_PASS: "secret",
        SMTP_HOST: "smtp.example.com",
        GEMINI_API_KEY: "key",
        CRON_SECRET: "cron",
        ADMIN_EMAIL: "admin@example.com",
      },
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("fails when firebase config is missing", () => {
    const cwd = makeTempDir();
    const result = validateEnv({ cwd, env: {} });

    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("firebase-applet-config.json"))).toBe(true);
  });

  it("fails when credentials file is missing", () => {
    const cwd = makeTempDir();
    fs.writeFileSync(
      path.join(cwd, "firebase-applet-config.json"),
      JSON.stringify({ projectId: "test-project" })
    );

    const result = validateEnv({
      cwd,
      env: { GOOGLE_APPLICATION_CREDENTIALS: path.join(cwd, "missing.json") },
    });

    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("GOOGLE_APPLICATION_CREDENTIALS"))).toBe(true);
  });

  it("warns on missing optional services", () => {
    const cwd = makeTempDir();
    fs.writeFileSync(
      path.join(cwd, "firebase-applet-config.json"),
      JSON.stringify({ projectId: "test-project" })
    );

    const result = validateEnv({ cwd, env: {} });

    expect(result.ok).toBe(true);
    expect(result.warnings.some((w) => w.includes("SMTP"))).toBe(true);
    expect(result.warnings.some((w) => w.includes("CRON_SECRET"))).toBe(true);
    expect(result.warnings.some((w) => w.includes("AI provider") || w.includes("AI API"))).toBe(true);
  });
});
