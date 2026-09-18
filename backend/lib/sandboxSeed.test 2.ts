import { describe, expect, it, vi } from "vitest";
import {
  SANDBOX_PARENT_EMAIL,
  SANDBOX_PASSWORD,
  ensureSandboxDistrictParent,
  getOrCreateSandboxAuthUser,
} from "./sandboxSeed.js";

describe("getOrCreateSandboxAuthUser", () => {
  it("resets password when the auth user already exists", async () => {
    const auth = {
      getUserByEmail: vi.fn().mockResolvedValue({ uid: "parent-uid" }),
      updateUser: vi.fn().mockResolvedValue(undefined),
      setCustomUserClaims: vi.fn().mockResolvedValue(undefined),
      createUser: vi.fn(),
    };

    const uid = await getOrCreateSandboxAuthUser(
      auth as never,
      SANDBOX_PARENT_EMAIL,
      SANDBOX_PASSWORD,
      "Parent of Alex M.",
      "parent"
    );

    expect(uid).toBe("parent-uid");
    expect(auth.updateUser).toHaveBeenCalledWith("parent-uid", { password: SANDBOX_PASSWORD });
    expect(auth.setCustomUserClaims).toHaveBeenCalledWith("parent-uid", { role: "parent" });
    expect(auth.createUser).not.toHaveBeenCalled();
  });
});

describe("ensureSandboxDistrictParent", () => {
  it("creates auth user and links parent profile to sandbox student", async () => {
    const parentUid = "parent-uid";
    const studentUid = "student-uid";
    const auth = {
      getUserByEmail: vi.fn().mockRejectedValue({ code: "auth/user-not-found" }),
      createUser: vi.fn().mockResolvedValue({ uid: parentUid }),
      setCustomUserClaims: vi.fn().mockResolvedValue(undefined),
      updateUser: vi.fn(),
    };
    const parentDocSet = vi.fn().mockResolvedValue(undefined);
    const studentDocSet = vi.fn().mockResolvedValue(undefined);
    const db = {
      collection: vi.fn((name: string) => {
        if (name === "users") {
          return {
            doc: vi.fn((id: string) => ({
              set: id === parentUid ? parentDocSet : studentDocSet,
            })),
          };
        }
        throw new Error(`unexpected collection ${name}`);
      }),
    };

    const uid = await ensureSandboxDistrictParent(auth as never, db as never, studentUid);

    expect(uid).toBe(parentUid);
    expect(auth.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: SANDBOX_PARENT_EMAIL, password: SANDBOX_PASSWORD })
    );
    expect(parentDocSet).toHaveBeenCalledWith(
      expect.objectContaining({
        email: SANDBOX_PARENT_EMAIL,
        linkedStudentUid: studentUid,
        activeStudentUid: studentUid,
      }),
      { merge: true }
    );
    expect(studentDocSet).toHaveBeenCalledWith(
      { parentUid, parentEmail: SANDBOX_PARENT_EMAIL },
      { merge: true }
    );
  });

  it("resolves sandbox student from classroom when uid is omitted", async () => {
    const studentUid = "student-uid";
    const auth = {
      getUserByEmail: vi.fn().mockResolvedValue({ uid: "parent-uid" }),
      updateUser: vi.fn().mockResolvedValue(undefined),
      setCustomUserClaims: vi.fn().mockResolvedValue(undefined),
    };
    const db = {
      collection: vi.fn((name: string) => {
        if (name === "classrooms") {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                data: () => ({ studentUids: [studentUid] }),
              }),
            }),
          };
        }
        if (name === "users") {
          return {
            doc: vi.fn().mockReturnValue({ set: vi.fn().mockResolvedValue(undefined) }),
          };
        }
        throw new Error(`unexpected collection ${name}`);
      }),
    };

    const uid = await ensureSandboxDistrictParent(auth as never, db as never);

    expect(uid).toBe("parent-uid");
    expect(auth.getUserByEmail).toHaveBeenCalledWith(SANDBOX_PARENT_EMAIL);
    expect(auth.updateUser).toHaveBeenCalledWith("parent-uid", { password: SANDBOX_PASSWORD });
  });
});
