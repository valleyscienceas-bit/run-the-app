import { describe, expect, it } from "vitest";
import {
  alreadySentDueReminder,
  canSendInactivityNudge,
  getLastActivityMs,
  isAssignmentIncomplete,
  isInactiveForDays,
  isInDueReminderWindow,
  MS_DAY,
  MS_HOUR,
  MS_WEEK,
} from "../../../backend/lib/studentEmails.ts";

describe("studentEmails helpers", () => {
  const now = new Date("2026-07-05T12:00:00.000Z");

  it("detects due window between 24 and 48 hours", () => {
    expect(isInDueReminderWindow(new Date(now.getTime() + 25 * MS_HOUR), now)).toBe(true);
    expect(isInDueReminderWindow(new Date(now.getTime() + 47 * MS_HOUR), now)).toBe(true);
    expect(isInDueReminderWindow(new Date(now.getTime() + 23 * MS_HOUR), now)).toBe(false);
    expect(isInDueReminderWindow(new Date(now.getTime() + 49 * MS_HOUR), now)).toBe(false);
  });

  it("treats non-completed submissions as incomplete", () => {
    expect(isAssignmentIncomplete({ status: "not_started" })).toBe(true);
    expect(isAssignmentIncomplete({ status: "in_progress" })).toBe(true);
    expect(isAssignmentIncomplete({ status: "completed" })).toBe(false);
    expect(isAssignmentIncomplete(undefined)).toBe(true);
  });

  it("dedupes due reminders per assignment", () => {
    expect(alreadySentDueReminder(undefined, "a1")).toBe(false);
    expect(alreadySentDueReminder({ a1: "2026-07-01" }, "a1")).toBe(true);
    expect(alreadySentDueReminder({ a1: "2026-07-01" }, "a2")).toBe(false);
  });

  it("picks the most recent activity timestamp", () => {
    const ms = getLastActivityMs(["2026-07-01", "2026-07-04", undefined]);
    expect(ms).toBe(new Date("2026-07-04").getTime());
  });

  it("flags inactivity after 7 days", () => {
    const last = now.getTime() - 8 * MS_DAY;
    expect(isInactiveForDays(last, 7, now.getTime())).toBe(true);
    expect(isInactiveForDays(now.getTime() - 3 * MS_DAY, 7, now.getTime())).toBe(false);
    expect(isInactiveForDays(null, 7, now.getTime())).toBe(false);
  });

  it("caps inactivity nudges to once per week", () => {
    expect(canSendInactivityNudge(undefined, now.getTime())).toBe(true);
    expect(canSendInactivityNudge(new Date(now.getTime() - 3 * MS_DAY).toISOString(), now.getTime())).toBe(false);
    expect(canSendInactivityNudge(new Date(now.getTime() - 8 * MS_DAY).toISOString(), now.getTime())).toBe(true);
  });
});
