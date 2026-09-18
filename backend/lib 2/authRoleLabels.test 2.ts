import { describe, expect, it } from "vitest";
import {
  extractPersonNameFromAuthDisplayName,
  formatAuthDisplayName,
  isAuthDisplayNameFormatted,
  normalizeAuthRole,
} from "./authRoleLabels.js";

describe("formatAuthDisplayName", () => {
  it("prefixes student names", () => {
    expect(formatAuthDisplayName("student", "Jane")).toBe("Student · Jane");
  });

  it("prefixes parent names", () => {
    expect(formatAuthDisplayName("parent", "Ankan")).toBe("Parent · Ankan");
  });

  it("prefixes teacher names", () => {
    expect(formatAuthDisplayName("teacher", "Ms. Lee")).toBe("Teacher · Ms. Lee");
  });

  it("converts Parent of child to Parent · child", () => {
    expect(formatAuthDisplayName("parent", "Parent of Jane")).toBe("Parent · Jane");
  });

  it("normalizes already-prefixed names", () => {
    expect(formatAuthDisplayName("student", "Parent · Jane")).toBe("Student · Jane");
  });

  it("falls back to role label when name is empty", () => {
    expect(formatAuthDisplayName("teacher", "")).toBe("Teacher");
  });
});

describe("extractPersonNameFromAuthDisplayName", () => {
  it("strips role prefix", () => {
    expect(extractPersonNameFromAuthDisplayName("Student · Jane")).toBe("Jane");
  });

  it("strips Parent of prefix", () => {
    expect(extractPersonNameFromAuthDisplayName("Parent of Jane")).toBe("Jane");
  });

  it("returns plain names unchanged", () => {
    expect(extractPersonNameFromAuthDisplayName("Ankan")).toBe("Ankan");
  });
});

describe("normalizeAuthRole", () => {
  it("defaults unknown roles to student", () => {
    expect(normalizeAuthRole("founder")).toBe("student");
  });
});

describe("isAuthDisplayNameFormatted", () => {
  it("detects formatted display names", () => {
    expect(isAuthDisplayNameFormatted("Student · Jane", "student")).toBe(true);
    expect(isAuthDisplayNameFormatted("Jane", "student")).toBe(false);
  });
});
