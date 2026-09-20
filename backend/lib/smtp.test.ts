import { describe, expect, it } from "vitest";
import {
  createMailTransporter,
  explainSmtpFailure,
  normalizeSmtpPass,
  readSmtpConfig,
} from "./smtp.js";

describe("smtp helpers", () => {
  it("strips spaces from app passwords", () => {
    expect(normalizeSmtpPass("abcd efgh ijkl mnop")).toBe("abcdefghijklmnop");
  });

  it("returns null when SMTP_USER missing", () => {
    expect(readSmtpConfig({})).toBeNull();
  });

  it("reads gmail config", () => {
    const cfg = readSmtpConfig({
      SMTP_USER: "valley@gmail.com",
      SMTP_PASS: "abcd efgh ijkl mnop",
      SMTP_SERVICE: "gmail",
    });
    expect(cfg?.pass).toBe("abcdefghijklmnop");
    expect(cfg?.user).toBe("valley@gmail.com");
  });

  it("explains Gmail 535 errors clearly", () => {
    const tip = explainSmtpFailure("Invalid login: 535-5.7.8 Username and Password not accepted");
    expect(tip).toContain("App Password");
    expect(tip).toContain("docs/email-setup.md");
  });

  it("uses gmail service transport for gmail users", () => {
    let captured: unknown;
    const fakeCreate = ((opts: unknown) => {
      captured = opts;
      return { options: opts };
    }) as typeof import("nodemailer").createTransport;

    createMailTransporter(
      {
        user: "valley@gmail.com",
        pass: "abcdefghijklmnop",
        service: "gmail",
        port: 587,
        secure: false,
      },
      fakeCreate
    );

    expect(captured).toEqual({
      service: "gmail",
      auth: { user: "valley@gmail.com", pass: "abcdefghijklmnop" },
    });
  });
});
