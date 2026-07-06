import { describe, expect, it } from "vitest";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS_MESSAGE,
  getPasswordValidationError,
  validatePassword,
} from "./passwordValidation.js";

describe("validatePassword", () => {
  it("accepts passwords with at least 8 chars, a letter, and a number", () => {
    expect(validatePassword("Sandbox123!")).toEqual({ valid: true });
    expect(validatePassword("hello123")).toEqual({ valid: true });
  });

  it("rejects short passwords", () => {
    expect(validatePassword("abc1")).toEqual({
      valid: false,
      message: PASSWORD_REQUIREMENTS_MESSAGE,
    });
  });

  it("rejects passwords without a letter or number", () => {
    expect(validatePassword("12345678")).toEqual({
      valid: false,
      message: PASSWORD_REQUIREMENTS_MESSAGE,
    });
    expect(validatePassword("abcdefgh")).toEqual({
      valid: false,
      message: PASSWORD_REQUIREMENTS_MESSAGE,
    });
  });

  it("returns null from getPasswordValidationError when valid", () => {
    expect(getPasswordValidationError("validPass1")).toBeNull();
    expect(PASSWORD_MIN_LENGTH).toBe(8);
  });
});
