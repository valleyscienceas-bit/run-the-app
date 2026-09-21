import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { provisionParentForStudent } from "./parentProvisioning.js";

type StoredDoc = Record<string, unknown>;

function createMockFirestore(initial: Record<string, StoredDoc> = {}) {
  const store = new Map<string, StoredDoc>(Object.entries(initial));

  const db = {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: vi.fn(async () => ({
          exists: store.has(`${name}/${id}`),
          data: () => store.get(`${name}/${id}`),
        })),
        set: vi.fn(async (data: StoredDoc, opts?: { merge?: boolean }) => {
          const key = `${name}/${id}`;
          if (opts?.merge && store.has(key)) {
            store.set(key, { ...store.get(key), ...data });
          } else {
            store.set(key, { ...data });
          }
        }),
      }),
    }),
  } as unknown as Firestore;

  return { db, store };
}

function createMockAuth(options?: { existingEmail?: string; existingUid?: string }) {
  const users = new Map<string, { email: string; displayName?: string; customClaims?: Record<string, unknown> }>();

  if (options?.existingEmail && options.existingUid) {
    users.set(options.existingUid, { email: options.existingEmail });
  }

  const auth = {
    getUserByEmail: vi.fn(async (email: string) => {
      for (const [uid, user] of users) {
        if (user.email === email) {
          return { uid, email, displayName: user.displayName, customClaims: user.customClaims };
        }
      }
      const err = new Error("not found") as Error & { code: string };
      err.code = "auth/user-not-found";
      throw err;
    }),
    createUser: vi.fn(async (params: { email: string; password: string; displayName?: string }) => {
      const uid = `auth_${users.size + 1}`;
      users.set(uid, { email: params.email, displayName: params.displayName });
      return { uid };
    }),
    setCustomUserClaims: vi.fn(async () => {}),
    updateUser: vi.fn(async (uid: string, updates: { displayName?: string }) => {
      const user = users.get(uid);
      if (user && updates.displayName) user.displayName = updates.displayName;
    }),
    generatePasswordResetLink: vi.fn(async () => "https://reset.example/link"),
  } as unknown as Auth;

  return { auth, users };
}

describe("provisionParentForStudent", () => {
  const sendEmail = vi.fn(async () => ({ sent: true, simulated: false }));

  beforeEach(() => {
    sendEmail.mockClear();
  });

  it("creates a district parent auth user and firestore profile", async () => {
    const { auth } = createMockAuth();
    const { db, store } = createMockFirestore();

    const result = await provisionParentForStudent(auth, db, sendEmail, {
      studentUid: "student_abc123",
      studentName: "Alex M.",
      parentEmail: "Parent@District.edu",
      studentGrade: "8",
      path: "district",
      districtId: "lasd",
      initialPassword: "Sandbox123!",
      sendWelcomeEmail: false,
    });

    expect(result.created).toBe(true);
    expect(result.parentUid).toMatch(/^auth_/);

    const parentProfile = store.get(`users/${result.parentUid}`);
    expect(parentProfile).toMatchObject({
      role: "parent",
      path: "district",
      districtId: "lasd",
      email: "parent@district.edu",
      linkedStudentUids: ["student_abc123"],
      activeStudentUid: "student_abc123",
      demoPassword: "Sandbox123!",
      isPaid: true,
    });

    const studentProfile = store.get("users/student_abc123");
    expect(studentProfile).toMatchObject({
      parentUid: result.parentUid,
      parentEmail: "parent@district.edu",
    });

    expect(auth.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "parent@district.edu",
        displayName: "Parent · Alex M.",
      })
    );
  });

  it("links an additional student to an existing parent account", async () => {
    const { auth } = createMockAuth({
      existingEmail: "parent@district.edu",
      existingUid: "parent_existing",
    });
    const { db, store } = createMockFirestore({
      "users/parent_existing": {
        uid: "parent_existing",
        role: "parent",
        path: "district",
        districtId: "lasd",
        linkedStudentUids: ["student_one"],
        linkedStudentUid: "student_one",
        name: "Parent · Sam",
        hasLoggedInBefore: true,
      },
    });

    const result = await provisionParentForStudent(auth, db, sendEmail, {
      studentUid: "student_two",
      studentName: "Jamie",
      parentEmail: "parent@district.edu",
      path: "district",
      districtId: "lasd",
      sendWelcomeEmail: false,
    });

    expect(result.created).toBe(false);
    expect(result.parentUid).toBe("parent_existing");

    const parentProfile = store.get("users/parent_existing");
    expect(parentProfile?.linkedStudentUids).toEqual(["student_one", "student_two"]);
    expect(parentProfile?.activeStudentUid).toBe("student_two");
    expect(auth.createUser).not.toHaveBeenCalled();
  });

  it("sends welcome email with district login instructions for new parents", async () => {
    const { auth } = createMockAuth();
    const { db } = createMockFirestore();

    await provisionParentForStudent(auth, db, sendEmail, {
      studentUid: "student_xyz",
      studentName: "Alex",
      parentEmail: "newparent@district.edu",
      path: "district",
      districtId: "pausd",
      sendWelcomeEmail: true,
    });

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'newparent@district.edu',
        context: 'provision-district-parent',
        html: expect.stringContaining('District Partnership'),
      })
    );
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('Parent'),
      })
    );
  });

  it("uses individual provision context for non-district paths", async () => {
    const { auth } = createMockAuth();
    const { db } = createMockFirestore();

    await provisionParentForStudent(auth, db, sendEmail, {
      studentUid: "student_ind",
      studentName: "Riley",
      parentEmail: "parent@home.com",
      path: "individual",
      sendWelcomeEmail: true,
    });

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        context: 'provision-parent',
        html: expect.stringContaining('Individual Access'),
      })
    );
  });

  it("does not send a second welcome email when parent Auth already exists", async () => {
    const { auth } = createMockAuth({
      existingEmail: "parent@home.com",
      existingUid: "auth_existing",
    });
    const { db, store } = createMockFirestore({
      "users/auth_existing": {
        role: "parent",
        email: "parent@home.com",
        hasLoggedInBefore: false,
        welcomeEmailSentAt: "2026-01-01T00:00:00.000Z",
        linkedStudentUids: ["student_old"],
      },
    });

    await provisionParentForStudent(auth, db, sendEmail, {
      studentUid: "student_new",
      studentName: "Sam",
      parentEmail: "parent@home.com",
      path: "individual",
      sendWelcomeEmail: true,
    });

    expect(sendEmail).not.toHaveBeenCalled();
    expect(store.get("users/auth_existing")?.linkedStudentUids).toEqual(
      expect.arrayContaining(["student_old", "student_new"])
    );
  });

  it("rejects weak initial passwords with the same rules as signup", async () => {
    const { auth } = createMockAuth();
    const { db } = createMockFirestore();

    await expect(
      provisionParentForStudent(auth, db, sendEmail, {
        studentUid: "student_pw",
        parentEmail: "parent@example.com",
        path: "district",
        districtId: "lasd",
        initialPassword: "short",
        sendWelcomeEmail: false,
      })
    ).rejects.toThrow(/8 characters/);

    expect(auth.createUser).not.toHaveBeenCalled();
  });
});
