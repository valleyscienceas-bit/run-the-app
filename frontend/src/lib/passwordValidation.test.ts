import { describe, expect, it } from "vitest";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS_MESSAGE,
  getPasswordValidationError,
  validatePassword,
} from "../../../backend/lib/passwordValidation.ts";

describe("validatePassword", () => {
  it("accepts passwords with at least 8 chars, a letter, and a number", () => {
    expect(validatePassword("Sandbox123!")).toEqual({ valid: true });
    expect(validatePassword("hello123")).toEqual({ valid: true });
    expect(validatePassword("A1aaaaaa")).toEqual({ valid: true });
  });

  it("rejects passwords shorter than the minimum length", () => {
    expect(validatePassword("abc1")).toEqual({
      valid: false,
      message: PASSWORD_REQUIREMENTS_MESSAGE,
    });
    expect(validatePassword("a1")).toEqual({
      valid: false,
      message: PASSWORD_REQUIREMENTS_MESSAGE,
    });
  });

  it("rejects passwords without a letter", () => {
    expect(validatePassword("12345678")).toEqual({
      valid: false,
      message: PASSWORD_REQUIREMENTS_MESSAGE,
    });
  });

  it("rejects passwords without a number", () => {
    expect(validatePassword("abcdefgh")).toEqual({
      valid: false,
      message: PASSWORD_REQUIREMENTS_MESSAGE,
    });
  });

  it("uses a single friendly requirements message for all failures", () => {
    expect(getPasswordValidationError("short1")).toBe(PASSWORD_REQUIREMENTS_MESSAGE);
    expect(getPasswordValidationError("validPass1")).toBeNull();
  });

  it("documents the minimum length constant", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
  });
});
