import { describe, expect, it } from "vitest";
import {
  authorizeDistrictParentLink,
  validateParentEmail,
} from "./linkDistrictParent.js";

const districtStudent = {
  role: "student",
  path: "district",
  classroomIds: ["class-1"],
  name: "Alex",
  grade: "8",
  districtId: "lasd",
};

const districtTeacher = {
  role: "teacher",
  path: "district",
  classroomIds: ["class-1"],
  districtId: "lasd",
};

describe("validateParentEmail", () => {
  it("accepts valid emails", () => {
    expect(validateParentEmail("parent@school.edu")).toBeNull();
  });

  it("rejects invalid emails", () => {
    expect(validateParentEmail("not-an-email")).toBeTruthy();
    expect(validateParentEmail("")).toBeTruthy();
  });
});

describe("authorizeDistrictParentLink", () => {
  it("allows district students to link their own parent", () => {
    const result = authorizeDistrictParentLink(
      {
        studentUid: "stu-1",
        parentEmail: "parent@home.com",
        requesterUid: "stu-1",
        requesterRole: "student",
      },
      districtStudent
    );
    expect(result.ok).toBe(true);
  });

  it("blocks students from linking other students", () => {
    const result = authorizeDistrictParentLink(
      {
        studentUid: "stu-1",
        parentEmail: "parent@home.com",
        requesterUid: "stu-2",
        requesterRole: "student",
      },
      districtStudent
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("allows teachers in the same classroom", () => {
    const result = authorizeDistrictParentLink(
      {
        studentUid: "stu-1",
        parentEmail: "parent@home.com",
        requesterUid: "teacher-1",
        requesterRole: "teacher",
      },
      districtStudent,
      districtTeacher
    );
    expect(result.ok).toBe(true);
  });

  it("blocks teachers not in the student classroom", () => {
    const result = authorizeDistrictParentLink(
      {
        studentUid: "stu-1",
        parentEmail: "parent@home.com",
        requesterUid: "teacher-2",
        requesterRole: "teacher",
      },
      districtStudent,
      { ...districtTeacher, classroomIds: ["other-class"] }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });
});
