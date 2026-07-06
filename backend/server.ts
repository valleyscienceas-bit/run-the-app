import express, { type Request, type Response } from "express";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { getFirestore, type DocumentSnapshot } from "firebase-admin/firestore";
import fs from "fs";
import crypto from "crypto";
import { generateSecret, generateURI, verify as verifyTotp } from "otplib";
import QRCode from "qrcode";
import { getSocraticResponse } from "./services/gemini.js";
import {
  buildAchievementCatalog,
  computeTotalPoints,
  getAchievementById,
  hasEarnedAchievement,
  verifyCompletionInResults,
  type AwardEligibilityContext,
  type EarnedAchievement,
} from "./lib/pointsAward.js";
import { runDueDateReminders, runInactivityNudges } from "./lib/studentEmailCron.js";
import { computeOpenAndClosedGaps } from "./lib/gapLogic.js";
import { computeNextAssignmentSubmission } from "./lib/assignmentProgress.js";
import { getPasswordValidationError } from "./lib/passwordValidation.js";
import {
  applyTopicCompletionServer,
  canCompleteTopicServer,
  emptyProgress,
  type StudentLearningProgress,
} from "./lib/learningProgression.js";
import { logEnvValidation, validateEnv } from "./lib/env.js";
import { formatHealthAlertBody, runHealthChecks } from "./lib/health.js";
import {
  backfillAuthRoleLabelsFromFirestore,
  createAuthUserWithRoleLabels,
  syncAuthUserRoleLabels,
} from "./lib/authUserProvisioning.js";
import { provisionParentForStudent } from "./lib/parentProvisioning.js";

dotenv.config();

const envValidation = validateEnv();
logEnvValidation(envValidation);
if (!envValidation.ok) {
  console.error("\n[ENV] Startup aborted — fix missing configuration and restart.\n");
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const firebaseConfigFile = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigFile, "utf8"));

if (!admin.apps.length) {
  const adminOptions: admin.AppOptions = {
    projectId: firebaseConfig.projectId
  };

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    adminOptions.credential = admin.credential.cert(
      JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"))
    );
  } else {
    adminOptions.credential = admin.credential.applicationDefault();
  }

  admin.initializeApp(adminOptions);
}

const adminAuth = admin.auth();
const adminDb = getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId || "(default)");

function emailHash(email: string): string {
  return crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
}

type AuthUser = { uid: string; email: string };

function verifyCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.authorization;
  if (auth === `Bearer ${secret}`) return true;
  const headerSecret = req.headers["x-cron-secret"];
  if (typeof headerSecret === "string" && headerSecret === secret) return true;
  return false;
}

async function verifyAuthHeader(req: Request): Promise<AuthUser | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(header.slice(7));
    return { uid: decoded.uid, email: decoded.email || "" };
  } catch {
    return null;
  }
}

async function getMailTransporter() {
  return nodemailer.createTransport({
    service: process.env.SMTP_SERVICE,
    host: process.env.SMTP_HOST || "smtp.ethereal.email",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { rejectUnauthorized: false }
  });
}

type EmailSendResult = { sent: boolean; simulated: boolean; error?: string };

async function sendValleyScienceEmail(opts: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  context?: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
}): Promise<EmailSendResult> {
  const to = opts.to.trim();
  const context = opts.context || "general";

  if (!to) {
    console.log(`[EMAIL] NOT SENT to (missing recipient) | subject: ${opts.subject} | context: ${context}`);
    return { sent: false, simulated: false, error: "missing recipient" };
  }

  if (!process.env.SMTP_USER) {
    console.log(`[EMAIL] NOT SENT to ${to} | reason: no SMTP configured | subject: ${opts.subject} | context: ${context}`);
    if (opts.text) console.log(`[EMAIL] Body (dev): ${opts.text}`);
    return { sent: false, simulated: true };
  }

  try {
    const transporter = await getMailTransporter();
    const info = await transporter.sendMail({
      from: `"Valley Science" <${process.env.SMTP_USER}>`,
      to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      attachments: opts.attachments
    });
    console.log(`[EMAIL] SENT to ${to} | subject: ${opts.subject} | context: ${context} | messageId: ${info.messageId || "n/a"}`);
    return { sent: true, simulated: false };
  } catch (err: any) {
    console.error(`[EMAIL] FAILED to ${to} | subject: ${opts.subject} | context: ${context} | error: ${err.message}`);
    return { sent: false, simulated: false, error: err.message };
  }
}

async function sendVerificationEmail(email: string, code: string, purpose: string): Promise<EmailSendResult> {
  const subjectByPurpose: Record<string, string> = {
    signup: "Your Valley Science Verification Code",
    login: "Your Valley Science Login Code",
    "enable-mfa": "Enable Two-Factor Authentication",
    "disable-mfa": "Disable Two-Factor Authentication"
  };
  const subject = subjectByPurpose[purpose] || "Your Valley Science Verification Code";
  const text = `Your verification code is: ${code}. It expires in 10 minutes.`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #0f172a;">Valley Science</h2>
      <p>Your verification code is:</p>
      <div style="font-size: 32px; font-weight: bold; color: #ec4899; margin: 20px 0;">${code}</div>
      <p style="color: #64748b; font-size: 14px;">This code expires in 10 minutes.</p>
    </div>
  `;

  const result = await sendValleyScienceEmail({ to: email, subject, text, html, context: purpose });
  if (result.simulated || !result.sent) {
    console.log(`[VERIFY:${purpose}] Code for ${email}: ${code}`);
  }
  return result;
}

async function resolveAuthEmail(authUser: AuthUser): Promise<string> {
  const tokenEmail = authUser.email?.trim().toLowerCase();
  if (tokenEmail) return tokenEmail;

  const profileSnap = await adminDb.collection("users").doc(authUser.uid).get();
  const profileEmail = profileSnap.data()?.email;
  return typeof profileEmail === "string" ? profileEmail.trim().toLowerCase() : "";
}

async function emailMatchesAccount(authUser: AuthUser, requestedEmail: string): Promise<boolean> {
  const normalized = requestedEmail.toLowerCase().trim();
  const accountEmail = await resolveAuthEmail(authUser);
  return !accountEmail || accountEmail === normalized;
}

async function verifyStoredCode(
  email: string,
  code: string,
  expectedPurpose?: string
): Promise<{ ok: true; uid?: string } | { ok: false; error: string }> {
  const hash = emailHash(email);
  const snap = await adminDb.collection("verification_codes").doc(hash).get();
  if (!snap.exists) {
    return { ok: false, error: "No verification code found. Please request a new one." };
  }

  const data = snap.data()!;
  if (expectedPurpose && data.purpose !== expectedPurpose) {
    return { ok: false, error: "Invalid verification code." };
  }
  if (new Date(data.expiresAt) < new Date()) {
    await snap.ref.delete();
    return { ok: false, error: "Verification code has expired. Please request a new one." };
  }
  if (data.code !== code) {
    return { ok: false, error: "Invalid verification code." };
  }

  await snap.ref.delete();
  return { ok: true, uid: data.uid };
}

async function verifyTotpForUser(uid: string, totpCode: string): Promise<boolean> {
  const secretSnap = await adminDb.collection("mfa_secrets").doc(uid).get();
  if (!secretSnap.exists) return false;
  const { totpSecret } = secretSnap.data() as { totpSecret: string };
  const result = await verifyTotp({ secret: totpSecret, token: totpCode });
  return result.valid;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3001;
  const APP_BASE_URL = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

  app.use(express.json());

  app.get("/api/health", async (_req, res) => {
    try {
      const health = await runHealthChecks(adminDb);
      res.status(health.ok ? 200 : 503).json({
        ...health,
        port: PORT,
        pid: process.pid,
      });
    } catch (error: any) {
      console.error("Health check error:", error);
      res.status(503).json({
        ok: false,
        checks: {
          server: { ok: true, message: "up" },
          firestore: { ok: false, message: error.message },
          smtp: { ok: false, message: "unavailable" },
          ai: { ok: false, message: "unavailable" },
        },
        timestamp: new Date().toISOString(),
        port: PORT,
        pid: process.pid,
      });
    }
  });

  // CORS for local frontend dev (allow any origin so 127.0.0.1 / LAN IPs work)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-cron-secret");
    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });

  // ==========================================
  // VERIFICATION CODE ROUTES (10-min expiry)
  // ==========================================
  app.post("/api/send-verification-code", async (req, res) => {
    const { email, purpose = "signup", password } = req.body;
    if (!email) return res.status(400).json({ error: "email is required" });

    if (purpose === "signup" && password) {
      const passwordError = getPasswordValidationError(password);
      if (passwordError) return res.status(400).json({ error: passwordError });
    }

    try {
      const authUser = await verifyAuthHeader(req);
      const normalizedEmail = email.toLowerCase().trim();

      if (authUser) {
        const matches = await emailMatchesAccount(authUser, normalizedEmail);
        if (!matches) {
          return res.status(403).json({ error: "Email does not match your account." });
        }
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const hash = emailHash(normalizedEmail);

      await adminDb.collection("verification_codes").doc(hash).set({
        code,
        email: normalizedEmail,
        purpose,
        uid: authUser?.uid || null,
        expiresAt,
        createdAt: new Date().toISOString()
      });

      const emailResult = await sendVerificationEmail(normalizedEmail, code, purpose);
      res.json({
        success: true,
        emailSent: emailResult.sent,
        simulated: emailResult.simulated
      });
    } catch (error: any) {
      console.error("Send verification code error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/verify-code", async (req, res) => {
    const { email, code, purpose } = req.body;
    if (!email || !code) return res.status(400).json({ error: "email and code are required" });

    try {
      const result = await verifyStoredCode(email, code, purpose);
      if (result.ok === false) return res.status(400).json({ error: result.error });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Verify code error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // MFA ROUTES (custom email + TOTP — no Firebase MFA)
  // ==========================================
  app.post("/api/mfa/totp/enroll-start", async (req, res) => {
    const authUser = await verifyAuthHeader(req);
    if (!authUser) return res.status(401).json({ error: "Unauthorized" });

    try {
      const profileSnap = await adminDb.collection("users").doc(authUser.uid).get();
      if (!profileSnap.exists || profileSnap.data()?.path !== "individual") {
        return res.status(403).json({ error: "Two-factor authentication is only available for individual accounts." });
      }

      const accountEmail = await resolveAuthEmail(authUser);
      const secret = generateSecret();
      const otpauthUrl = generateURI({
        issuer: "Valley Science",
        label: accountEmail || profileSnap.data()?.email || authUser.uid,
        secret,
        strategy: "totp"
      });
      const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

      await adminDb.collection("mfa_enroll_pending").doc(authUser.uid).set({
        totpSecret: secret,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString()
      });

      res.json({ qrDataUrl, manualKey: secret });
    } catch (error: any) {
      console.error("TOTP enroll start error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/mfa/totp/enroll-complete", async (req, res) => {
    const authUser = await verifyAuthHeader(req);
    if (!authUser) return res.status(401).json({ error: "Unauthorized" });

    const { totpCode } = req.body;
    if (!totpCode) return res.status(400).json({ error: "totpCode is required" });

    try {
      const pendingSnap = await adminDb.collection("mfa_enroll_pending").doc(authUser.uid).get();
      if (!pendingSnap.exists) {
        return res.status(400).json({ error: "No pending authenticator setup. Please start again." });
      }

      const pending = pendingSnap.data()!;
      if (new Date(pending.expiresAt) < new Date()) {
        await pendingSnap.ref.delete();
        return res.status(400).json({ error: "Authenticator setup expired. Please start again." });
      }

      const result = await verifyTotp({ secret: pending.totpSecret, token: totpCode });
      if (!result.valid) {
        return res.status(400).json({ error: "Invalid authenticator code. Please try again." });
      }

      await adminDb.collection("mfa_secrets").doc(authUser.uid).set({
        totpSecret: pending.totpSecret,
        createdAt: new Date().toISOString()
      });
      await pendingSnap.ref.delete();
      await adminDb.collection("users").doc(authUser.uid).update({
        mfaEnabled: true,
        mfaMethod: "totp"
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("TOTP enroll complete error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/mfa/send-login-code", async (req, res) => {
    const authUser = await verifyAuthHeader(req);
    if (!authUser) return res.status(401).json({ error: "Unauthorized" });

    try {
      const profileSnap = await adminDb.collection("users").doc(authUser.uid).get();
      const profile = profileSnap.data();
      if (!profile?.mfaEnabled || profile.mfaMethod !== "email") {
        return res.status(400).json({ error: "Email two-factor authentication is not enabled for this account." });
      }

      const accountEmail = await resolveAuthEmail(authUser);
      if (!accountEmail) {
        return res.status(400).json({ error: "No email on file for this account." });
      }

      const rateSnap = await adminDb.collection("mfa_rate_limits").doc(authUser.uid).get();
      if (rateSnap.exists) {
        const lastSent = new Date(rateSnap.data()!.lastSentAt).getTime();
        if (Date.now() - lastSent < 60_000) {
          return res.status(429).json({ error: "Please wait before requesting another code." });
        }
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const hash = emailHash(accountEmail);
      await adminDb.collection("verification_codes").doc(hash).set({
        code,
        email: accountEmail,
        purpose: "login",
        uid: authUser.uid,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString()
      });
      const emailResult = await sendVerificationEmail(accountEmail, code, "login");
      await adminDb.collection("mfa_rate_limits").doc(authUser.uid).set({
        lastSentAt: new Date().toISOString()
      });

      res.json({ success: true, emailSent: emailResult.sent, simulated: emailResult.simulated });
    } catch (error: any) {
      console.error("Send login MFA code error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/mfa/complete-login", async (req, res) => {
    const { email, uid, emailCode, totpCode } = req.body;
    if (!email && !uid) return res.status(400).json({ error: "email or uid is required" });
    if (!emailCode && !totpCode) {
      return res.status(400).json({ error: "emailCode or totpCode is required" });
    }

    try {
      let userDoc: DocumentSnapshot | null = null;

      if (uid) {
        const snap = await adminDb.collection("users").doc(uid).get();
        if (snap.exists) {
          userDoc = snap;
        }
      }

      if (!userDoc && email) {
        const normalizedEmail = email.toLowerCase().trim();
        const usersSnap = await adminDb.collection("users")
          .where("email", "==", normalizedEmail)
          .limit(1)
          .get();

        if (!usersSnap.empty) {
          userDoc = usersSnap.docs[0];
        } else {
          const exactSnap = await adminDb.collection("users")
            .where("email", "==", email.trim())
            .limit(1)
            .get();
          if (!exactSnap.empty) {
            userDoc = exactSnap.docs[0];
          }
        }
      }

      if (!userDoc) {
        return res.status(400).json({ error: "Account not found." });
      }

      const profile = userDoc.data()!;
      if (!profile.mfaEnabled) {
        return res.status(400).json({ error: "Two-factor authentication is not enabled for this account." });
      }

      if (profile.mfaMethod === "email") {
        if (!emailCode) return res.status(400).json({ error: "emailCode is required" });
        const accountEmail = email || profile.email;
        if (!accountEmail) return res.status(400).json({ error: "Account email not found." });
        const codeResult = await verifyStoredCode(accountEmail, emailCode, "login");
        if (codeResult.ok === false) return res.status(400).json({ error: codeResult.error });
        if (codeResult.uid && codeResult.uid !== userDoc.id) {
          return res.status(400).json({ error: "Invalid verification code." });
        }
      } else if (profile.mfaMethod === "totp") {
        if (!totpCode) return res.status(400).json({ error: "totpCode is required" });
        const valid = await verifyTotpForUser(userDoc.id, totpCode);
        if (!valid) return res.status(400).json({ error: "Invalid authenticator code." });
      } else {
        return res.status(400).json({ error: "Unsupported MFA method." });
      }

      const customToken = await adminAuth.createCustomToken(userDoc.id);
      const profileData = { uid: userDoc.id, ...profile };
      res.json({ customToken, profile: profileData });
    } catch (error: any) {
      console.error("Complete login MFA error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/mfa/settings", async (req, res) => {
    const authUser = await verifyAuthHeader(req);
    if (!authUser) return res.status(401).json({ error: "Unauthorized" });

    const { action, mfaMethod, emailCode, totpCode } = req.body;
    if (!action) return res.status(400).json({ error: "action is required" });

    try {
      const profileSnap = await adminDb.collection("users").doc(authUser.uid).get();
      if (!profileSnap.exists || profileSnap.data()?.path !== "individual") {
        return res.status(403).json({ error: "Two-factor authentication is only available for individual accounts." });
      }

      if (action === "enable") {
        if (mfaMethod !== "email") {
          return res.status(400).json({ error: "Use TOTP enrollment endpoints for authenticator setup." });
        }
        if (!emailCode) return res.status(400).json({ error: "emailCode is required" });
        const accountEmail = await resolveAuthEmail(authUser);
        if (!accountEmail) {
          return res.status(400).json({ error: "No email on file for this account." });
        }
        const codeResult = await verifyStoredCode(accountEmail, emailCode, "enable-mfa");
        if (codeResult.ok === false) return res.status(400).json({ error: codeResult.error });

        await adminDb.collection("users").doc(authUser.uid).update({
          mfaEnabled: true,
          mfaMethod: "email"
        });
        res.json({ success: true, mfaEnabled: true, mfaMethod: "email" });
        return;
      }

      if (action === "disable") {
        const profile = profileSnap.data()!;
        if (!profile.mfaEnabled) {
          return res.status(400).json({ error: "Two-factor authentication is not enabled." });
        }

        if (profile.mfaMethod === "email") {
          if (!emailCode) return res.status(400).json({ error: "emailCode is required" });
          const accountEmail = await resolveAuthEmail(authUser);
          if (!accountEmail) {
            return res.status(400).json({ error: "No email on file for this account." });
          }
          const codeResult = await verifyStoredCode(accountEmail, emailCode, "disable-mfa");
          if (codeResult.ok === false) return res.status(400).json({ error: codeResult.error });
        } else if (profile.mfaMethod === "totp") {
          if (!totpCode) return res.status(400).json({ error: "totpCode is required" });
          const valid = await verifyTotpForUser(authUser.uid, totpCode);
          if (!valid) return res.status(400).json({ error: "Invalid authenticator code." });
        }

        await adminDb.collection("mfa_secrets").doc(authUser.uid).delete().catch(() => {});
        await adminDb.collection("mfa_enroll_pending").doc(authUser.uid).delete().catch(() => {});
        await adminDb.collection("users").doc(authUser.uid).update({
          mfaEnabled: false,
          mfaMethod: null
        });
        res.json({ success: true, mfaEnabled: false, mfaMethod: null });
        return;
      }

      res.status(400).json({ error: "Invalid action." });
    } catch (error: any) {
      console.error("MFA settings error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // SOCRATIC AI ROUTE
  // ==========================================
  app.post("/api/chat", async (req, res) => {
    const { history, message, moduleContext, studentContext } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    try {
      const messages = history && history.length > 0
        ? [...history, { role: "user", text: message }]
        : [{ role: "user", text: message }];

      const response = await getSocraticResponse(messages, moduleContext, studentContext);
      res.json({ response });
    } catch (error: any) {
      console.error("Gemini Chat Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // CREATE USER PROFILE ROUTE (Admin SDK bypasses Firestore rules)
  // ==========================================
  app.post("/api/create-profile", async (req, res) => {
    const { uid, profile } = req.body;

    if (!uid || !profile) {
      return res.status(400).json({ error: "uid and profile are required" });
    }

    try {
      if (profile.role === 'parent') {
        return res.status(403).json({ error: "Parent profiles cannot be created via this endpoint. Parent accounts are provisioned automatically when a student signs up." });
      }
      await adminDb.collection("users").doc(uid).set(profile);
      await syncAuthUserRoleLabels(adminAuth, uid, profile.role, profile.name);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Create profile error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // PROVISION PARENT ACCOUNT ROUTE
  // ==========================================
  app.post("/api/provision-parent", async (req, res) => {
    const { studentUid, studentName, parentEmail, studentGrade, path, districtId } = req.body;

    if (!studentUid || !parentEmail) {
      return res.status(400).json({ error: "studentUid and parentEmail are required" });
    }

    try {
      const accessPath = path === "district" ? "district" : "individual";
      const result = await provisionParentForStudent(adminAuth, adminDb, sendValleyScienceEmail, {
        studentUid,
        studentName,
        parentEmail,
        studentGrade,
        path: accessPath,
        districtId: accessPath === "district" ? districtId : undefined,
      });
      console.log(`[PROVISION] Created/updated parent profile at Auth UID: ${result.parentUid}`);
      res.json({ success: true, parentDocId: result.parentDocId, parentUid: result.parentUid });
    } catch (error: any) {
      console.error("Parent provisioning error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/provision-district-parent", async (req, res) => {
    const { teacherUid, studentUid, parentEmail, parentName } = req.body;
    if (!teacherUid || !studentUid || !parentEmail) {
      return res.status(400).json({ error: "teacherUid, studentUid, and parentEmail are required" });
    }

    try {
      const [teacherSnap, studentSnap] = await Promise.all([
        adminDb.collection("users").doc(teacherUid).get(),
        adminDb.collection("users").doc(studentUid).get(),
      ]);
      if (!teacherSnap.exists || teacherSnap.data()?.role !== "teacher") {
        return res.status(403).json({ error: "Teacher not found" });
      }
      if (!studentSnap.exists || studentSnap.data()?.role !== "student") {
        return res.status(404).json({ error: "Student not found" });
      }

      const student = studentSnap.data()!;
      if (student.path !== "district") {
        return res.status(400).json({ error: "Student is not a district account" });
      }

      const teacherClassrooms: string[] = teacherSnap.data()?.classroomIds || [];
      const studentClassrooms: string[] = student.classroomIds || [];
      const sharesClassroom = studentClassrooms.some((id) => teacherClassrooms.includes(id));
      if (!sharesClassroom && student.teacherUid !== teacherUid) {
        return res.status(403).json({ error: "Student is not in your class" });
      }

      const districtId = student.districtId || teacherSnap.data()?.districtId;
      const result = await provisionParentForStudent(adminAuth, adminDb, sendValleyScienceEmail, {
        studentUid,
        studentName: student.name,
        parentEmail,
        parentName,
        studentGrade: student.grade,
        path: "district",
        districtId,
      });

      res.json({ success: true, parentUid: result.parentUid });
    } catch (error: any) {
      console.error("District parent provisioning error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // USERNAME LOOKUP ROUTE
  // ==========================================
  app.post("/api/lookup-username", async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "username is required" });
    try {
      const snapshot = await adminDb.collection("users").where("username", "==", username).limit(1).get();
      if (snapshot.empty) return res.status(404).json({ error: "Username not found." });
      const data = snapshot.docs[0].data();
      res.json({ email: data.email });
    } catch (error: any) {
      console.error("Username lookup error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // TRACK LEARNING TIME ROUTE
  // ==========================================
  app.post("/api/track-time", async (req, res) => {
    const { uid, sessionSeconds } = req.body;
    if (!uid || sessionSeconds === undefined) return res.status(400).json({ error: "uid and sessionSeconds are required" });
    try {
      const ref = adminDb.collection("stats").doc(uid);
      const snap = await ref.get();
      const current = snap.exists ? (snap.data()?.totalSeconds || 0) : 0;
      await ref.set({ totalSeconds: current + sessionSeconds, lastUpdated: new Date().toISOString() }, { merge: true });
      res.json({ success: true, totalSeconds: current + sessionSeconds });
    } catch (error: any) {
      console.error("Track time error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // PARENT: LINKED STUDENT OVERVIEW ROUTE
  // ==========================================
  app.post("/api/student-overview", async (req, res) => {
    const { parentUid, studentUid: requestedStudentUid } = req.body;
    if (!parentUid) return res.status(400).json({ error: "parentUid is required" });
    try {
      const parentSnap = await adminDb.collection("users").doc(parentUid).get();
      if (!parentSnap.exists) return res.status(404).json({ error: "Parent profile not found." });

      const parentData = parentSnap.data() || {};
      const studentUid = requestedStudentUid
        || parentData.activeStudentUid
        || parentData.linkedStudentUid
        || (parentData.linkedStudentUids && parentData.linkedStudentUids[0]);
      if (!studentUid) return res.status(404).json({ error: "No student is linked to this parent account." });

      const [studentSnap, resultsSnap, statsSnap] = await Promise.all([
        adminDb.collection("users").doc(studentUid).get(),
        adminDb.collection("results").doc(studentUid).get(),
        adminDb.collection("stats").doc(studentUid).get()
      ]);

      const linkedUids = parentData.linkedStudentUids
        || (parentData.linkedStudentUid ? [parentData.linkedStudentUid] : []);

      // Verify requested student belongs to this parent
      if (requestedStudentUid && linkedUids.length > 0 && !linkedUids.includes(requestedStudentUid)) {
        return res.status(403).json({ error: "Student not linked to this parent." });
      }

      if (requestedStudentUid && requestedStudentUid !== parentData.activeStudentUid) {
        await adminDb.collection("users").doc(parentUid).update({ activeStudentUid: requestedStudentUid });
      }

      const linkedStudents: { uid: string; name: string; grade?: string; username: string; isPaid?: boolean }[] = [];
      for (const uid of linkedUids) {
        const snap = await adminDb.collection("users").doc(uid).get();
        if (snap.exists) {
          const d = snap.data()!;
          linkedStudents.push({ uid, name: d.name, grade: d.grade, username: d.username, isPaid: d.isPaid });
        }
      }

      res.json({
        studentProfile: studentSnap.exists ? studentSnap.data() : null,
        results: resultsSnap.exists ? (resultsSnap.data()?.results || []) : [],
        stats: statsSnap.exists ? statsSnap.data() : { totalSeconds: 0 },
        linkedStudents,
        activeStudentUid: studentUid
      });
    } catch (error: any) {
      console.error("Student overview error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // PARENT: DELETE LINKED STUDENT ACCOUNT ROUTE
  // ==========================================
  app.post("/api/delete-student", async (req, res) => {
    const { parentUid } = req.body;
    if (!parentUid) return res.status(400).json({ error: "parentUid is required" });
    try {
      const parentSnap = await adminDb.collection("users").doc(parentUid).get();
      if (!parentSnap.exists) return res.status(404).json({ error: "Parent profile not found." });

      const parentData = parentSnap.data() || {};
      const studentUid = parentData.linkedStudentUid;
      if (!studentUid) return res.status(404).json({ error: "No student is linked to this parent account." });

      // Delete student data + auth
      const studentDocs = ["users", "results", "stats", "chat_history"].map((c) =>
        adminDb.collection(c).doc(studentUid).delete().catch(() => {})
      );
      await Promise.all(studentDocs);
      await adminAuth.deleteUser(studentUid).catch((e: any) => {
        if (e.code !== "auth/user-not-found") console.error("Delete student auth error:", e);
      });

      // Delete the parent's own data + auth (parent is tied to the student)
      const legacyParentDocId = `parent_${studentUid}`;
      await Promise.all([
        adminDb.collection("users").doc(parentUid).delete().catch(() => {}),
        adminDb.collection("users").doc(legacyParentDocId).delete().catch(() => {}),
        adminDb.collection("stats").doc(parentUid).delete().catch(() => {})
      ]);
      await adminAuth.deleteUser(parentUid).catch((e: any) => {
        if (e.code !== "auth/user-not-found") console.error("Delete parent auth error:", e);
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete student error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // ACHIEVEMENT POINTS (server-verified, idempotent)
  // ==========================================
  app.post("/api/award-points", async (req, res) => {
    const authUser = await verifyAuthHeader(req);
    if (!authUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { achievementId, context } = req.body as {
      achievementId?: string;
      context?: AwardEligibilityContext;
    };

    if (!achievementId || !context?.testType || typeof context.score !== "number") {
      return res.status(400).json({ error: "achievementId and context (testType, score) are required" });
    }

    const studentUid = authUser.uid;

    try {
      const userSnap = await adminDb.collection("users").doc(studentUid).get();
      if (!userSnap.exists) {
        return res.status(404).json({ error: "Profile not found" });
      }
      const userData = userSnap.data() || {};
      if (userData.role !== "student") {
        return res.status(403).json({ error: "Only students earn achievement points" });
      }

      const def = getAchievementById(achievementId);
      if (!def) {
        return res.status(404).json({ error: "Achievement not configured or has no point value" });
      }

      const outcome = await adminDb.runTransaction(async (tx) => {
        const userRef = adminDb.collection("users").doc(studentUid);
        const resultsRef = adminDb.collection("results").doc(studentUid);
        const [userDoc, resultsDoc] = await Promise.all([tx.get(userRef), tx.get(resultsRef)]);

        const earned = (userDoc.data()?.earnedAchievements || []) as EarnedAchievement[];

        if (hasEarnedAchievement(earned, achievementId)) {
          const totalPoints = userDoc.data()?.totalPoints ?? computeTotalPoints(earned);
          return { alreadyEarned: true as const, totalPoints, earnedAchievements: earned };
        }

        const results = resultsDoc.data()?.results || [];
        if (!verifyCompletionInResults(results, def, context)) {
          throw Object.assign(new Error("Completion criteria not met"), { code: "COMPLETION_NOT_VERIFIED" });
        }

        const newAchievement = {
          id: def.id,
          label: def.label,
          points: def.pointsAwarded,
          earnedAt: new Date().toISOString(),
          source: def.source,
          sourceId: def.sourceId,
        };
        const earnedAchievements = [...earned, newAchievement];
        const totalPoints = computeTotalPoints(earnedAchievements);
        tx.update(userRef, { earnedAchievements, totalPoints });
        return {
          alreadyEarned: false as const,
          totalPoints,
          earnedAchievements,
          awarded: newAchievement,
        };
      });

      res.json({ success: true, ...outcome });
    } catch (error: any) {
      if (error?.code === "COMPLETION_NOT_VERIFIED") {
        return res.status(403).json({ error: "Completion criteria not verified" });
      }
      console.error("Award points error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // SAVE TEST RESULTS ROUTE
  // ==========================================
  app.post("/api/save-results", async (req, res) => {
    const { uid, results } = req.body;

    if (!uid || !results) {
      return res.status(400).json({ error: "uid and results are required" });
    }

    try {
      await adminDb.collection("results").doc(uid).set({ results }, { merge: true });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Save results error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // SMTP EMAIL ROUTE
  // ==========================================
  app.post("/api/send-email", async (req, res) => {
    const { to, subject, text, html } = req.body;

    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const result = await sendValleyScienceEmail({
        to,
        subject,
        text,
        html,
        context: "api-send-email"
      });

      if (result.simulated) {
        return res.json({ success: true, message: "Email simulated (no SMTP config)", emailSent: false, simulated: true });
      }
      if (!result.sent) {
        return res.status(500).json({ error: result.error || "Failed to send email" });
      }

      res.json({ success: true, emailSent: true });
    } catch (error: any) {
      console.error("Email error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // PARENT ACTIVATION / PASSWORD RESET ROUTE
  // ==========================================
  app.post("/api/activate-parent", async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    try {
      // 1. Check if user already exists in Auth
      let userExists = false;
      try {
        await adminAuth.getUserByEmail(email);
        userExists = true;
      } catch (err: any) {
        if (err.code !== "auth/user-not-found") throw err;
      }

      // 2. Check if user exists in Firestore
      const usersRef = adminDb.collection("users");
      const snapshot = await usersRef.where("email", "==", email).get();

      if (snapshot.empty && !userExists) {
        return res.status(404).json({ error: "No profile found with this email." });
      }

      const userData = !snapshot.empty ? snapshot.docs[0].data() : { name: "User" };

      // 3. Create user in Auth if not exists
      if (!userExists) {
        const role = userData.role || "parent";
        await createAuthUserWithRoleLabels(adminAuth, {
          email,
          emailVerified: true,
          role,
          name: userData.name || "User",
          password: Math.random().toString(36).slice(-12) + "A1!",
        });
        console.log(`[AUTH-SYSTEM] Created new Auth user for activation: ${email}`);
      }

      // 4. Generate a password reset link
      const resetLink = await adminAuth.generatePasswordResetLink(email);

      // 5. Send branded activation/reset email
      const emailHtml = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0f172a;">Reset your Valley Science password</h2>
          <p>Hello,</p>
          <p>We received a request to reset the password for your Valley Science account (student, parent, or teacher).</p>
          <p>Click the button below to choose a new password and sign in:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background: #ec4899; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Set New Password</a>
          </div>
          <p style="color: #64748b; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
          <p style="color: #64748b; font-size: 14px;">If the button doesn't work, copy and paste this link: <br/> <a href="${resetLink}">${resetLink}</a></p>
        </div>
      `;

      const emailResult = await sendValleyScienceEmail({
        to: email,
        subject: "Reset your Valley Science password",
        html: emailHtml,
        text: `Reset your Valley Science password: ${resetLink}`,
        context: "password-reset"
      });

      res.json({
        success: true,
        message: "Account verification email sent.",
        emailSent: emailResult.sent,
        simulated: emailResult.simulated
      });
    } catch (error: any) {
      console.error("Parent activation/reset error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // PARENT WEEKLY PROGRESS DIGEST (positive stats only)
  // ==========================================
  app.post("/api/send-parent-digest", async (req, res) => {
    const { parentUid } = req.body;
    if (!parentUid) return res.status(400).json({ error: "parentUid required" });

    try {
      const parentSnap = await adminDb.collection("users").doc(parentUid).get();
      if (!parentSnap.exists || parentSnap.data()?.role !== "parent") {
        return res.status(403).json({ error: "Not a parent account" });
      }
      const parent = parentSnap.data()!;
      const lastSent = parent.lastParentDigestAt ? new Date(parent.lastParentDigestAt).getTime() : 0;
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      if (lastSent && Date.now() - lastSent < weekMs) {
        return res.json({ sent: false, skipped: "already_sent_this_week" });
      }

      const linked: string[] = parent.linkedStudentUids
        || (parent.linkedStudentUid ? [parent.linkedStudentUid] : []);
      if (linked.length === 0) {
        return res.json({ sent: false, skipped: "no_students" });
      }

      const cards: { name: string; timeLabel: string; tests: number; avg: string; best: string; closed: number; exploring: string[] }[] = [];

      for (const studentUid of linked) {
        const [studentSnap, resultsSnap, statsSnap] = await Promise.all([
          adminDb.collection("users").doc(studentUid).get(),
          adminDb.collection("results").doc(studentUid).get(),
          adminDb.collection("stats").doc(studentUid).get(),
        ]);
        if (!studentSnap.exists) continue;
        const student = studentSnap.data()!;
        const results: { score: number; gaps?: string[] }[] = resultsSnap.exists
          ? (resultsSnap.data()?.results || [])
          : [];
        const totalSeconds = statsSnap.exists ? (statsSnap.data()?.totalSeconds || 0) : 0;
        if (totalSeconds < 60 && results.length === 0) continue;

        const { openGaps, closedGaps } = computeOpenAndClosedGaps(results);
        const exploring = openGaps.slice(0, 4);
        const avg = results.length
          ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
          : null;
        const best = results.length ? Math.round(Math.max(...results.map(r => r.score))) : null;
        const mins = Math.floor(totalSeconds / 60);
        const timeLabel = mins < 60
          ? `${Math.max(mins, totalSeconds > 0 ? 1 : 0)} min`
          : `${Math.floor(mins / 60)}h ${mins % 60}m`;

        cards.push({
          name: (student.name || "Your student").split(" ")[0],
          timeLabel,
          tests: results.length,
          avg: avg != null ? `${avg}%` : "—",
          best: best != null ? `${best}%` : "—",
          closed: closedGaps.length,
          exploring,
        });
      }

      if (cards.length === 0) {
        return res.json({ sent: false, skipped: "no_activity" });
      }

      const to = (parent.email || "").trim();
      if (!to) return res.json({ sent: false, skipped: "no_email" });

      const cardHtml = cards.map(c => `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:20px;padding:20px;margin:0 0 16px;">
          <h3 style="margin:0 0 12px;color:#0f172a;font-size:18px;">${c.name}'s week in science</h3>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:8px;background:#fff;border-radius:12px;text-align:center;width:25%;">
                <div style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">Time learning</div>
                <div style="font-size:22px;font-weight:900;color:#0f172a;margin-top:4px;">${c.timeLabel}</div>
              </td>
              <td style="width:8px;"></td>
              <td style="padding:8px;background:#fff;border-radius:12px;text-align:center;width:25%;">
                <div style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">Tests</div>
                <div style="font-size:22px;font-weight:900;color:#0f172a;margin-top:4px;">${c.tests}</div>
              </td>
              <td style="width:8px;"></td>
              <td style="padding:8px;background:#fff;border-radius:12px;text-align:center;width:25%;">
                <div style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">Avg score</div>
                <div style="font-size:22px;font-weight:900;color:#0f172a;margin-top:4px;">${c.avg}</div>
              </td>
              <td style="width:8px;"></td>
              <td style="padding:8px;background:#fff;border-radius:12px;text-align:center;width:25%;">
                <div style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">Best score</div>
                <div style="font-size:22px;font-weight:900;color:#87A96B;margin-top:4px;">${c.best}</div>
              </td>
            </tr>
          </table>
          ${c.closed > 0 ? `<p style="margin:14px 0 0;color:#87A96B;font-weight:700;font-size:14px;">Closed ${c.closed} conceptual gap${c.closed === 1 ? "" : "s"} — nice progress.</p>` : ""}
          ${c.exploring.length > 0 ? `<p style="margin:10px 0 0;color:#64748b;font-size:13px;"><strong style="color:#0f172a;">Next ideas to explore:</strong> ${c.exploring.join("; ")}</p>` : ""}
        </div>
      `).join("");

      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
          <h2 style="margin:0 0 8px;font-size:24px;">Valley Science progress update</h2>
          <p style="margin:0 0 20px;color:#64748b;line-height:1.5;">Here is a snapshot of learning activity on Valley Science. These highlights reflect time spent and growth — not a report card.</p>
          ${cardHtml}
          <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;">You receive this at most once a week when there is learning activity to share.</p>
        </div>
      `;
      const text = cards.map(c =>
        `${c.name}: ${c.timeLabel} learning, ${c.tests} tests, avg ${c.avg}, best ${c.best}` +
        (c.closed ? `, closed ${c.closed} gaps` : "") +
        (c.exploring.length ? `. Exploring: ${c.exploring.join("; ")}` : "")
      ).join("\n");

      const emailResult = await sendValleyScienceEmail({
        to,
        subject: "Your child's Valley Science progress",
        html,
        text,
        context: "parent-digest",
      });

      await adminDb.collection("users").doc(parentUid).update({
        lastParentDigestAt: new Date().toISOString(),
      });

      res.json({
        sent: emailResult.sent,
        simulated: emailResult.simulated,
        studentsIncluded: cards.length,
      });
    } catch (error: any) {
      console.error("Parent digest error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // TEACHER WEEKLY CLASS SNAPSHOT (positive stats only)
  // ==========================================
  async function sendTeacherDigestForUid(teacherUid: string): Promise<{
    sent: boolean;
    simulated?: boolean;
    skipped?: string;
    classroomsIncluded?: number;
  }> {
    const teacherSnap = await adminDb.collection("users").doc(teacherUid).get();
    if (!teacherSnap.exists || teacherSnap.data()?.role !== "teacher") {
      return { sent: false, skipped: "not_teacher" };
    }
    const teacher = teacherSnap.data()!;
    const lastSent = teacher.lastTeacherDigestAt ? new Date(teacher.lastTeacherDigestAt).getTime() : 0;
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    if (lastSent && Date.now() - lastSent < weekMs) {
      return { sent: false, skipped: "already_sent_this_week" };
    }

    const classroomIds: string[] = teacher.classroomIds || [];
    if (classroomIds.length === 0) {
      return { sent: false, skipped: "no_classrooms" };
    }

    const now = new Date();
    const classSections: {
      name: string;
      studentCount: number;
      activeCount: number;
      avgScore: string;
      openGaps: number;
      overdueAssignments: number;
    }[] = [];

    for (const classroomId of classroomIds) {
      const classSnap = await adminDb.collection("classrooms").doc(classroomId).get();
      if (!classSnap.exists) continue;
      const classData = classSnap.data()!;
      const studentUids: string[] = classData.studentUids || [];
      if (studentUids.length === 0) continue;

      let activeCount = 0;
      let totalScore = 0;
      let testsTaken = 0;
      let openGapTotal = 0;

      for (const uid of studentUids) {
        const [resultsSnap, statsSnap] = await Promise.all([
          adminDb.collection("results").doc(uid).get(),
          adminDb.collection("stats").doc(uid).get(),
        ]);
        const results = resultsSnap.exists ? (resultsSnap.data()?.results || []) : [];
        const totalSeconds = statsSnap.exists ? (statsSnap.data()?.totalSeconds || 0) : 0;
        if (totalSeconds >= 60 || results.length > 0) activeCount++;
        for (const r of results) {
          totalScore += r.score || 0;
          testsTaken++;
        }
        const { openGaps } = computeOpenAndClosedGaps(results);
        openGapTotal += openGaps.length;
      }

      const assignSnap = await adminDb.collection("assignments").where("classroomId", "==", classroomId).get();
      let overdueAssignments = 0;
      for (const d of assignSnap.docs) {
        const data = d.data();
        const dueAt = new Date(data.dueAt);
        if (dueAt >= now) continue;
        const subs = data.submissions || {};
        for (const uid of studentUids) {
          const sub = subs[uid] || { status: "not_started" };
          if (sub.status !== "completed") overdueAssignments++;
        }
      }

      if (activeCount === 0 && testsTaken === 0) continue;

      classSections.push({
        name: classData.name || "Class",
        studentCount: studentUids.length,
        activeCount,
        avgScore: testsTaken ? `${Math.round(totalScore / testsTaken)}%` : "—",
        openGaps: openGapTotal,
        overdueAssignments,
      });
    }

    if (classSections.length === 0) {
      return { sent: false, skipped: "no_activity" };
    }

    const to = (teacher.email || "").trim();
    if (!to) return { sent: false, skipped: "no_email" };

    const sectionHtml = classSections.map(c => `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:20px;padding:20px;margin:0 0 16px;">
        <h3 style="margin:0 0 12px;color:#0f172a;font-size:18px;">${c.name}</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px;background:#fff;border-radius:12px;text-align:center;width:20%;">
              <div style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;">Students</div>
              <div style="font-size:22px;font-weight:900;color:#0f172a;margin-top:4px;">${c.studentCount}</div>
            </td>
            <td style="width:6px;"></td>
            <td style="padding:8px;background:#fff;border-radius:12px;text-align:center;width:20%;">
              <div style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;">Active</div>
              <div style="font-size:22px;font-weight:900;color:#87A96B;margin-top:4px;">${c.activeCount}</div>
            </td>
            <td style="width:6px;"></td>
            <td style="padding:8px;background:#fff;border-radius:12px;text-align:center;width:20%;">
              <div style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;">Class avg</div>
              <div style="font-size:22px;font-weight:900;color:#0f172a;margin-top:4px;">${c.avgScore}</div>
            </td>
            <td style="width:6px;"></td>
            <td style="padding:8px;background:#fff;border-radius:12px;text-align:center;width:20%;">
              <div style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;">Open gaps</div>
              <div style="font-size:22px;font-weight:900;color:#0f172a;margin-top:4px;">${c.openGaps}</div>
            </td>
            <td style="width:6px;"></td>
            <td style="padding:8px;background:#fff;border-radius:12px;text-align:center;width:20%;">
              <div style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;">Overdue</div>
              <div style="font-size:22px;font-weight:900;color:#${c.overdueAssignments > 0 ? "dc2626" : "0f172a"};margin-top:4px;">${c.overdueAssignments}</div>
            </td>
          </tr>
        </table>
      </div>
    `).join("");

    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
        <h2 style="margin:0 0 8px;font-size:24px;">Your class snapshot</h2>
        <p style="margin:0 0 20px;color:#64748b;line-height:1.5;">Weekly summary of learning activity across your classrooms on Valley Science.</p>
        ${sectionHtml}
        <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;">You receive this at most once a week when there is meaningful class activity.</p>
      </div>
    `;
    const text = classSections.map(c =>
      `${c.name}: ${c.activeCount}/${c.studentCount} active, avg ${c.avgScore}, ${c.openGaps} open gaps, ${c.overdueAssignments} overdue submissions`
    ).join("\n");

    const emailResult = await sendValleyScienceEmail({
      to,
      subject: "Your Valley Science class snapshot",
      html,
      text,
      context: "teacher-digest",
    });

    await adminDb.collection("users").doc(teacherUid).update({
      lastTeacherDigestAt: new Date().toISOString(),
    });

    return {
      sent: emailResult.sent,
      simulated: emailResult.simulated,
      classroomsIncluded: classSections.length,
    };
  }

  app.post("/api/send-teacher-digest", async (req, res) => {
    const { teacherUid } = req.body;
    if (!teacherUid) return res.status(400).json({ error: "teacherUid required" });
    try {
      const result = await sendTeacherDigestForUid(teacherUid);
      res.json(result);
    } catch (error: any) {
      console.error("Teacher digest error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // STUDENT EMAIL CRON (due reminders + inactivity nudges — students only)
  // ==========================================

  async function handleStudentEmailCron(
    req: Request,
    res: Response,
    mode: "all" | "due-reminders" | "inactivity"
  ) {
    if (!verifyCronSecret(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!process.env.CRON_SECRET) {
      return res.status(503).json({ error: "CRON_SECRET is not configured" });
    }

    try {
      const dueReminders =
        mode === "all" || mode === "due-reminders"
          ? await runDueDateReminders(adminDb, sendValleyScienceEmail, APP_BASE_URL)
          : null;
      const inactivityNudges =
        mode === "all" || mode === "inactivity"
          ? await runInactivityNudges(adminDb, sendValleyScienceEmail, APP_BASE_URL)
          : null;

      res.json({
        ok: true,
        mode,
        dueReminders,
        inactivityNudges,
      });
    } catch (error: any) {
      console.error("Student email cron error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  app.post("/api/cron/student-emails", (req, res) => {
    const mode = (req.body?.mode || req.query?.mode || "all") as string;
    const allowed = ["all", "due-reminders", "inactivity"];
    if (!allowed.includes(mode)) {
      return res.status(400).json({ error: `mode must be one of: ${allowed.join(", ")}` });
    }
    return handleStudentEmailCron(req, res, mode as "all" | "due-reminders" | "inactivity");
  });

  app.get("/api/cron/student-emails", (req, res) => {
    const mode = (req.query?.mode || "all") as string;
    const allowed = ["all", "due-reminders", "inactivity"];
    if (!allowed.includes(mode)) {
      return res.status(400).json({ error: `mode must be one of: ${allowed.join(", ")}` });
    }
    return handleStudentEmailCron(req, res, mode as "all" | "due-reminders" | "inactivity");
  });

  app.post("/api/cron/student-due-reminders", (req, res) =>
    handleStudentEmailCron(req, res, "due-reminders")
  );

  app.post("/api/cron/student-inactivity-nudges", (req, res) =>
    handleStudentEmailCron(req, res, "inactivity")
  );

  async function handleTeacherDigestCron(req: Request, res: Response) {
    if (!verifyCronSecret(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!process.env.CRON_SECRET) {
      return res.status(503).json({ error: "CRON_SECRET is not configured" });
    }

    try {
      const teachersSnap = await adminDb.collection("users").where("role", "==", "teacher").get();
      let sent = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const doc of teachersSnap.docs) {
        try {
          const result = await sendTeacherDigestForUid(doc.id);
          if (result.sent) sent++;
          else skipped++;
        } catch (err: any) {
          errors.push(`${doc.id}: ${err.message}`);
        }
      }

      res.json({ ok: true, teachers: teachersSnap.size, sent, skipped, errors });
    } catch (error: any) {
      console.error("Teacher digest cron error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  app.post("/api/cron/teacher-digest", handleTeacherDigestCron);
  app.get("/api/cron/teacher-digest", handleTeacherDigestCron);

  // ==========================================
  // OPS CRON (health alerts + firestore export scaffold)
  // ==========================================
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "valley.science.as@gmail.com";

  async function handleHealthCheckCron(req: Request, res: Response) {
    if (!verifyCronSecret(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!process.env.CRON_SECRET) {
      return res.status(503).json({ error: "CRON_SECRET is not configured" });
    }

    try {
      const health = await runHealthChecks(adminDb);
      if (health.ok) {
        return res.json({ ok: true, health, alertSent: false });
      }

      const { text, html } = formatHealthAlertBody(health, APP_BASE_URL);
      const alertResult = await sendValleyScienceEmail({
        to: ADMIN_EMAIL,
        subject: "[Valley Science] Health check failed",
        text,
        html,
        context: "health-alert",
      });

      res.status(503).json({
        ok: false,
        health,
        alertSent: alertResult.sent,
        alertSimulated: alertResult.simulated,
        alertError: alertResult.error,
      });
    } catch (error: any) {
      console.error("Health check cron error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  app.post("/api/cron/health-check", handleHealthCheckCron);
  app.get("/api/cron/health-check", handleHealthCheckCron);

  async function handleFirestoreExportCron(req: Request, res: Response) {
    if (!verifyCronSecret(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!process.env.CRON_SECRET) {
      return res.status(503).json({ error: "CRON_SECRET is not configured" });
    }

    const bucket = process.env.GCS_BACKUP_BUCKET?.trim();
    const projectId = firebaseConfig.projectId;
    const databaseId = firebaseConfig.firestoreDatabaseId || "(default)";

    if (!bucket) {
      return res.status(503).json({
        ok: false,
        error: "GCS_BACKUP_BUCKET is not configured",
        hint: "Set GCS_BACKUP_BUCKET in .env and run backend/scripts/export-firestore.sh via Cloud Scheduler or cron",
      });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputUri = `${bucket.replace(/\/$/, "")}/${timestamp}`;
    const gcloudCommand =
      `gcloud firestore export "${outputUri}" --project="${projectId}" --database="${databaseId}"`;

    res.json({
      ok: true,
      message:
        "Firestore export is not triggered from the app — use gcloud or Cloud Scheduler with export-firestore.sh",
      projectId,
      databaseId,
      outputUri,
      gcloudCommand,
      script: "backend/scripts/export-firestore.sh",
    });
  }

  app.post("/api/cron/firestore-export", handleFirestoreExportCron);
  app.get("/api/cron/firestore-export", handleFirestoreExportCron);

  // ==========================================
  // INQUIRY & FEEDBACK ROUTES (save-first, email best-effort)
  // ==========================================

  async function sendEmailBestEffort(opts: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    context?: string;
    attachments?: { filename: string; content: Buffer; contentType?: string }[];
  }): Promise<boolean> {
    const result = await sendValleyScienceEmail({
      ...opts,
      context: opts.context || "notification"
    });
    return result.sent || result.simulated;
  }

  app.post("/api/inquiry", async (req, res) => {
    const { type, name, email, phone, district, role, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: "name, email, and message are required" });
    }
    if (type === "district" && (!district || !role)) {
      return res.status(400).json({ error: "district and role are required for district inquiries" });
    }

    try {
      const docRef = adminDb.collection("inquiries").doc();
      const record = {
        type: type === "district" ? "district" : "contact",
        name,
        email,
        phone: phone || "",
        district: district || "",
        role: role || "",
        message,
        submittedAt: new Date().toISOString(),
      };
      await docRef.set(record);

      const isDistrict = type === "district";
      const subject = isDistrict
        ? `District Inquiry: ${district}`
        : `Contact Us: ${name}`;
      const adminText = [
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone #: ${phone || "N/A"}`,
        isDistrict ? `District: ${district}` : null,
        isDistrict ? `Role: ${role}` : null,
        `Message: ${message}`,
      ]
        .filter(Boolean)
        .join("\n");
      const adminHtml = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0f172a;">${isDistrict ? "New District Inquiry" : "New Contact Message"}</h2>
          <p><strong>From:</strong> ${name} (${email})</p>
          ${phone ? `<p><strong>Phone #:</strong> ${phone}</p>` : ""}
          ${isDistrict ? `<p><strong>District:</strong> ${district}</p>` : ""}
          ${isDistrict ? `<p><strong>Role:</strong> ${role}</p>` : ""}
          <p><strong>Message:</strong></p>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">${message}</div>
        </div>`;

      await sendEmailBestEffort({
        to: ADMIN_EMAIL,
        subject,
        text: adminText,
        html: adminHtml,
        context: "inquiry-admin"
      });

      await sendEmailBestEffort({
        to: email,
        subject: isDistrict
          ? "We received your Valley Science inquiry"
          : "We received your Valley Science message",
        text: isDistrict
          ? `Hi ${name}, thank you for reaching out. Our team will get back to you shortly regarding ${district}.`
          : `Hi ${name}, thank you for contacting Valley Science. We've received your message and our team will be in touch shortly.`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #0f172a;">${isDistrict ? "Inquiry Received" : "Message Received"}</h2>
            <p>Hi ${name},</p>
            <p>${
              isDistrict
                ? `Thank you for reaching out to Valley Science. We've received your inquiry regarding <strong>${district}</strong> and our team will be in touch shortly.`
                : "Thank you for reaching out to Valley Science. We've received your message and our team will be in touch shortly."
            }</p>
            <p style="color: #64748b; font-size: 14px;">Best regards,<br>The Valley Science Team</p>
          </div>`,
        context: "inquiry-confirmation"
      });

      res.json({ success: true, id: docRef.id });
    } catch (error: any) {
      console.error("Inquiry error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/feedback", async (req, res) => {
    const { name, email, phone, role, message, file } = req.body;
    if (!name || !email || !role || !message) {
      return res.status(400).json({ error: "name, email, role, and message are required" });
    }

    try {
      const docRef = adminDb.collection("feedback").doc();
      const record: Record<string, unknown> = {
        name,
        email,
        phone: phone || "",
        role,
        message,
        fileName: file?.name || null,
        submittedAt: new Date().toISOString(),
      };
      await docRef.set(record);

      const attachments =
        file?.data && file?.name
          ? [
              {
                filename: file.name,
                content: Buffer.from(file.data, "base64"),
                contentType: file.mimeType || "application/octet-stream",
              },
            ]
          : undefined;

      await sendEmailBestEffort({
        to: ADMIN_EMAIL,
        subject: `Feedback from ${name}`,
        text: [
          `Name: ${name}`,
          `Email: ${email}`,
          `Phone: ${phone || "N/A"}`,
          `Role: ${role}`,
          `Message: ${message}`,
          file?.name ? `Attachment: ${file.name}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #0f172a;">New Feedback</h2>
            <p><strong>From:</strong> ${name} (${email})</p>
            ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ""}
            <p><strong>Role:</strong> ${role}</p>
            <p><strong>Feedback:</strong></p>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">${message}</div>
            ${file?.name ? `<p><strong>Attachment:</strong> ${file.name}</p>` : ""}
          </div>`,
        attachments,
        context: "feedback-admin"
      });

      await sendEmailBestEffort({
        to: email,
        subject: "Thanks for your Valley Science feedback",
        text: `Hi ${name}, thank you for helping us improve Valley Science. We've received your feedback.`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #0f172a;">Feedback Received</h2>
            <p>Hi ${name},</p>
            <p>Thank you for helping us improve Valley Science. We've received your feedback and appreciate you taking the time to share it.</p>
            <p style="color: #64748b; font-size: 14px;">— The Valley Science Team</p>
          </div>`,
        context: "feedback-confirmation"
      });

      res.json({ success: true, id: docRef.id });
    } catch (error: any) {
      console.error("Feedback error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // DEMO REQUEST / APPROVE ROUTES
  // ==========================================

  function demoLoginInstructionsHtml(demoEmail: string, tempPassword: string) {
    return `
      <div style="font-family:sans-serif;padding:20px;max-width:560px;">
        <h2 style="color:#0f172a;margin:0 0 16px;">Demo Approved!</h2>
        <p style="color:#475569;line-height:1.6;">Your Valley Science demo is ready. Follow these steps to log in:</p>
        <ol style="color:#334155;line-height:1.8;padding-left:20px;margin:16px 0;">
          <li>Go to <a href="${APP_BASE_URL}" style="color:#e11d48;font-weight:700;">${APP_BASE_URL}</a></li>
          <li>Click <strong>Log In</strong> in the top-right corner</li>
          <li>Choose <strong>Individual</strong></li>
          <li>Choose <strong>Student</strong></li>
          <li>Enter your email and password below, then sign in</li>
        </ol>
        <div style="background:#f8fafc;border-radius:12px;padding:16px;margin:20px 0;">
          <p style="margin:0 0 8px;"><strong>Email:</strong> ${demoEmail}</p>
          <p style="margin:0;"><strong>Password:</strong> ${tempPassword}</p>
        </div>
        <p style="color:#64748b;font-size:14px;">Access expires in 48 hours. After logging in, use the <strong>Parent</strong> toggle in the app to explore the parent view with the same password on the linked parent account.</p>
        <a href="${APP_BASE_URL}" style="background:#e11d48;color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;display:inline-block;margin-top:12px;">Open Valley Science</a>
      </div>`;
  }

  function demoLoginInstructionsText(demoEmail: string, tempPassword: string) {
    return [
      "Your Valley Science demo is ready. Here's how to log in:",
      "",
      `1. Go to ${APP_BASE_URL}`,
      "2. Click Log In in the top-right corner",
      "3. Choose Individual",
      "4. Choose Student",
      "5. Sign in with the credentials below",
      "",
      `Email: ${demoEmail}`,
      `Password: ${tempPassword}`,
      "",
      "Access expires in 48 hours.",
    ].join("\n");
  }

  function demoApprovePage(title: string, message: string, detail?: string) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — Valley Science</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { background: white; border-radius: 24px; padding: 40px; max-width: 520px; width: 100%; box-shadow: 0 20px 60px rgba(15,23,42,0.08); }
    h1 { margin: 0 0 12px; font-size: 1.75rem; }
    p { margin: 0 0 16px; line-height: 1.6; color: #475569; }
    .detail { background: #f1f5f9; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 0.95rem; }
    a { color: #ec4899; font-weight: 700; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    ${detail ? `<div class="detail">${detail}</div>` : ""}
    <p><a href="${APP_BASE_URL}">← Back to Valley Science</a></p>
  </div>
</body>
</html>`;
  }

  app.post("/api/demo-request", async (req, res) => {
    const { name, email, reason } = req.body;
    if (!name || !email || !reason) return res.status(400).json({ error: "name, email, and reason are required" });
    try {
      const approveToken = crypto.randomBytes(32).toString("hex");
      const docRef = adminDb.collection("demo_requests").doc();
      await docRef.set({
        name, email, reason,
        status: "pending",
        approveToken,
        requestedAt: new Date().toISOString()
      });

      const approveUrl = `${APP_BASE_URL}/api/demo-approve?token=${approveToken}`;
      console.log(`[DEMO] New request from ${name} <${email}>`);
      console.log(`[DEMO] Approve URL: ${approveUrl}`);
      console.log(`[DEMO] Admin notification goes to: ${ADMIN_EMAIL}`);

      const adminHtml = `
        <div style="font-family:sans-serif;padding:20px;">
          <h2>New Demo Request</h2>
          <p><strong>${name}</strong> (${email}) wants a demo.</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <a href="${approveUrl}" style="background:#ec4899;color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;display:inline-block;margin-top:20px;">Approve Demo</a>
        </div>`;

      const emailSent = await sendEmailBestEffort({
        to: ADMIN_EMAIL,
        subject: `Demo Request: ${name}`,
        html: adminHtml,
        text: `Demo request from ${name} (${email}). Reason: ${reason}\n\nApprove: ${approveUrl}`,
        context: "demo-request-admin"
      });

      if (!emailSent) {
        console.warn("[DEMO] Admin email was not sent — use the Approve URL above or Founder View in the app.");
      }

      await sendEmailBestEffort({
        to: email,
        subject: "We received your Valley Science demo request",
        html: `
          <div style="font-family:sans-serif;padding:20px;">
            <h2 style="color:#0f172a;">Demo Request Received</h2>
            <p>Hi ${name},</p>
            <p>Thanks for your interest in Valley Science! We've received your demo request and will email you login details once it's approved.</p>
            <p style="color:#64748b;font-size:14px;">— The Valley Science Team</p>
          </div>`,
        text: `Hi ${name},\n\nThanks for your interest in Valley Science! We've received your demo request and will email you login details once it's approved.`,
        context: "demo-request-confirmation"
      });

      res.json({ success: true, emailSent, adminEmail: ADMIN_EMAIL });
    } catch (error: any) {
      console.error("Demo request error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/demo-requests/pending", async (req, res) => {
    const founderUid = req.query.founderUid;
    if (!founderUid || typeof founderUid !== "string") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const userSnap = await adminDb.collection("users").doc(founderUid).get();
      if (!userSnap.exists || userSnap.data()?.role !== "founder") {
        return res.status(403).json({ error: "Forbidden" });
      }

      const snap = await adminDb.collection("demo_requests").where("status", "==", "pending").get();
      const requests = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name,
            email: data.email,
            reason: data.reason,
            requestedAt: data.requestedAt,
            approveUrl: `${APP_BASE_URL}/api/demo-approve?token=${data.approveToken}`,
          };
        })
        .sort((a, b) => (b.requestedAt || "").localeCompare(a.requestedAt || ""));

      res.json({ requests, adminEmail: ADMIN_EMAIL });
    } catch (error: any) {
      console.error("Pending demo requests error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/demo-approve", async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).send("Missing token");
    try {
      const snap = await adminDb.collection("demo_requests").where("approveToken", "==", token).limit(1).get();
      if (snap.empty) return res.status(404).send("Invalid or expired approval link.");
      const doc = snap.docs[0];
      const data = doc.data();
      if (data.status === "approved") {
        return res.send(demoApprovePage(
          "Demo already approved",
          `A demo for <strong>${data.email}</strong> was already approved.`,
          "If they need help logging in, resend credentials from Firebase or approve a new request."
        ));
      }

      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const demoEmail = data.email;
      const tempPassword = crypto.randomBytes(8).toString("hex") + "A1!";

      // Create demo student
      let studentUid: string;
      try {
        const existing = await adminAuth.getUserByEmail(demoEmail);
        studentUid = existing.uid;
        await adminAuth.updateUser(studentUid, { password: tempPassword });
        await syncAuthUserRoleLabels(adminAuth, studentUid, "student", data.name);
      } catch {
        const created = await createAuthUserWithRoleLabels(adminAuth, {
          email: demoEmail,
          password: tempPassword,
          role: "student",
          name: data.name,
        });
        studentUid = created.uid;
      }

      const studentProfile = {
        uid: studentUid, name: data.name, username: `demo_${studentUid.slice(-6)}`, email: demoEmail,
        role: "student", path: "individual", grade: "7", xp: 0, isFirstTime: false, isPaid: true,
        isDemo: true, demoExpiresAt: expiresAt, demoParentUid: "", createdAt: new Date().toISOString()
      };
      await adminDb.collection("users").doc(studentUid).set(studentProfile, { merge: true });

      // Demo parent
      const parentEmail = `parent.${demoEmail}`;
      let parentUid: string;
      try {
        const p = await adminAuth.getUserByEmail(parentEmail);
        parentUid = p.uid;
        await adminAuth.updateUser(parentUid, { password: tempPassword });
        await syncAuthUserRoleLabels(adminAuth, parentUid, "parent", `Parent of ${data.name}`);
      } catch {
        const created = await createAuthUserWithRoleLabels(adminAuth, {
          email: parentEmail,
          password: tempPassword,
          role: "parent",
          name: `Parent of ${data.name}`,
        });
        parentUid = created.uid;
      }
      await adminDb.collection("users").doc(parentUid).set({
        uid: parentUid, linkedStudentUid: studentUid, linkedStudentUids: [studentUid], activeStudentUid: studentUid,
        name: `Parent of ${data.name}`, username: `demo_parent_${studentUid.slice(-6)}`, email: parentEmail,
        role: "parent", path: "individual", grade: "7", xp: 0, isFirstTime: false, isPaid: true,
        isDemo: true, demoExpiresAt: expiresAt, demoStudentUid: studentUid, createdAt: new Date().toISOString()
      }, { merge: true });

      await adminDb.collection("users").doc(studentUid).set({ demoParentUid: parentUid }, { merge: true });

      await doc.ref.update({ status: "approved", approvedAt: new Date().toISOString(), expiresAt, demoStudentUid: studentUid, demoParentUid: parentUid });

      const demoEmailResult = await sendValleyScienceEmail({
        to: demoEmail,
        subject: "Your Valley Science Demo is Ready!",
        html: demoLoginInstructionsHtml(demoEmail, tempPassword),
        text: demoLoginInstructionsText(demoEmail, tempPassword),
        context: "demo-approve"
      });
      res.send(demoApprovePage(
        "Demo approved",
        `Demo access for <strong>${data.name}</strong> (<strong>${demoEmail}</strong>) is ready.`,
        demoEmailResult.sent
          ? `Login credentials were emailed to <strong>${demoEmail}</strong>. They should click <strong>Log In</strong> (top right) → <strong>Individual</strong> → <strong>Student</strong>, then sign in. Access expires in 48 hours.`
          : `Share these login steps manually:<br><br>1. Go to ${APP_BASE_URL}<br>2. Click <strong>Log In</strong> (top right)<br>3. Choose <strong>Individual</strong> → <strong>Student</strong><br>4. Sign in with:<br>Email: <strong>${demoEmail}</strong><br>Password: <strong>${tempPassword}</strong><br><br>Access expires in 48 hours.`
      ));
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // ==========================================
  // PARENT: UPDATE STUDENT GRADE
  // ==========================================
  app.post("/api/update-student-grade", async (req, res) => {
    const { parentUid, newGrade, studentUid: requestedStudentUid } = req.body;
    if (!parentUid || !newGrade) return res.status(400).json({ error: "parentUid and newGrade required" });
    try {
      const parentSnap = await adminDb.collection("users").doc(parentUid).get();
      if (!parentSnap.exists) return res.status(404).json({ error: "Parent not found" });
      const parentData = parentSnap.data()!;
      const studentUid = requestedStudentUid
        || parentData.activeStudentUid
        || parentData.linkedStudentUid
        || (parentData.linkedStudentUids && parentData.linkedStudentUids[0]);
      if (!studentUid) return res.status(404).json({ error: "No linked student" });

      const studentSnap = await adminDb.collection("users").doc(studentUid).get();
      if (!studentSnap.exists) return res.status(404).json({ error: "Student not found" });
      const studentData = studentSnap.data()!;
      const oldGrade = studentData.grade;

      const updatePayload: Record<string, unknown> = {
        grade: newGrade,
        gradeOverrides: admin.firestore.FieldValue.arrayUnion({
          grade: newGrade, at: new Date().toISOString(), by: parentUid,
          previousGrade: oldGrade || null
        })
      };

      // Archive progress for the grade being left — never delete existing results
      if (oldGrade && oldGrade !== newGrade) {
        const [resultsSnap, statsSnap] = await Promise.all([
          adminDb.collection("results").doc(studentUid).get(),
          adminDb.collection("stats").doc(studentUid).get()
        ]);
        const progressByGrade = { ...(studentData.progressByGrade || {}) };
        progressByGrade[oldGrade] = {
          results: resultsSnap.exists ? (resultsSnap.data()?.results || []) : [],
          stats: statsSnap.exists ? statsSnap.data() : { totalSeconds: 0 },
          archivedAt: new Date().toISOString()
        };
        updatePayload.progressByGrade = progressByGrade;
      }

      await adminDb.collection("users").doc(studentUid).update(updatePayload);
      await adminDb.collection("users").doc(parentUid).update({ activeStudentUid: studentUid });
      res.json({ success: true, previousGrade: oldGrade, progressPreserved: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // PARENT: CREATE ADDITIONAL STUDENT
  // ==========================================
  app.post("/api/parent-create-student", async (req, res) => {
    const { parentUid, name, username, email, password, grade } = req.body;
    if (!parentUid || !name || !email || !password) return res.status(400).json({ error: "Missing required fields" });
    const passwordError = getPasswordValidationError(password);
    if (passwordError) return res.status(400).json({ error: passwordError });
    try {
      const parentSnap = await adminDb.collection("users").doc(parentUid).get();
      if (!parentSnap.exists || parentSnap.data()?.role !== "parent") return res.status(403).json({ error: "Not a parent account" });

      const created = await createAuthUserWithRoleLabels(adminAuth, {
        email,
        password,
        role: "student",
        name,
      });
      const studentUid = created.uid;
      const parentData = parentSnap.data()!;

      await adminDb.collection("users").doc(studentUid).set({
        uid: studentUid, name, username: username || `student_${studentUid.slice(-6)}`, email,
        parentUid, parentEmail: parentData.email, role: "student", path: "individual",
        grade: grade || "6", xp: 0, isFirstTime: true, isPaid: false, hasLoggedInBefore: false, createdAt: new Date().toISOString()
      });

      const existing = parentData.linkedStudentUids || (parentData.linkedStudentUid ? [parentData.linkedStudentUid] : []);
      await adminDb.collection("users").doc(parentUid).update({
        linkedStudentUids: [...existing, studentUid],
        activeStudentUid: studentUid
      });

      res.json({ success: true, studentUid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // TEACHER / ADMIN / CLASSROOM ROUTES
  // ==========================================
  app.post("/api/teacher-classrooms", async (req, res) => {
    const { teacherUid } = req.body;
    if (!teacherUid) return res.status(400).json({ error: "teacherUid required" });
    try {
      const snap = await adminDb.collection("classrooms").where("teacherUid", "==", teacherUid).get();
      const classrooms = snap.docs.map(d => ({ id: d.id, ...d.data(), studentCount: (d.data().studentUids || []).length }));
      res.json({ classrooms });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin-classrooms", async (req, res) => {
    const { districtId } = req.body;
    if (!districtId) return res.status(400).json({ error: "districtId required" });
    try {
      const snap = await adminDb.collection("classrooms").where("districtId", "==", districtId).get();
      const classrooms = snap.docs.map(d => ({ id: d.id, ...d.data(), studentCount: (d.data().studentUids || []).length }));
      res.json({ classrooms });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/classroom-students", async (req, res) => {
    const { classroomId } = req.body;
    if (!classroomId) return res.status(400).json({ error: "classroomId required" });
    try {
      const classSnap = await adminDb.collection("classrooms").doc(classroomId).get();
      if (!classSnap.exists) return res.status(404).json({ error: "Classroom not found" });
      const studentUids: string[] = classSnap.data()?.studentUids || [];
      const students = [];
      for (const uid of studentUids) {
        const [userSnap, resultsSnap, statsSnap] = await Promise.all([
          adminDb.collection("users").doc(uid).get(),
          adminDb.collection("results").doc(uid).get(),
          adminDb.collection("stats").doc(uid).get()
        ]);
        students.push({
          studentProfile: userSnap.exists ? userSnap.data() : null,
          results: resultsSnap.exists ? (resultsSnap.data()?.results || []) : [],
          stats: statsSnap.exists ? statsSnap.data() : { totalSeconds: 0 }
        });
      }
      res.json({ students });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/classroom-assignments", async (req, res) => {
    const { classroomId } = req.body;
    if (!classroomId) return res.status(400).json({ error: "classroomId required" });
    try {
      const snap = await adminDb.collection("assignments").where("classroomId", "==", classroomId).get();
      const assignments = snap.docs.map(d => ({ id: d.id, ...d.data(), moduleCount: (d.data().moduleIds || []).length }));
      res.json({ assignments });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/create-assignment", async (req, res) => {
    const { classroomId, teacherUid, title, dueAt, grade, minScore, moduleIds } = req.body;
    if (!classroomId || !teacherUid || !title || !dueAt) {
      return res.status(400).json({ error: "classroomId, teacherUid, title, and dueAt are required" });
    }
    const dueDate = new Date(dueAt);
    if (isNaN(dueDate.getTime())) {
      return res.status(400).json({ error: "Invalid dueAt date format" });
    }
    try {
      const classSnap = await adminDb.collection("classrooms").doc(classroomId).get();
      if (!classSnap.exists) return res.status(404).json({ error: "Classroom not found" });
      const studentUids: string[] = classSnap.data()?.studentUids || [];
      const submissions: Record<string, { status: string; progress: number }> = {};
      for (const uid of studentUids) {
        submissions[uid] = { status: "not_started", progress: 0 };
      }
      const ref = adminDb.collection("assignments").doc();
      const assignment = {
        id: ref.id, classroomId, teacherUid, title, dueAt: dueDate.toISOString(), grade: grade || "7",
        minScore: minScore || null, moduleIds: moduleIds || [], submissions,
        createdAt: new Date().toISOString()
      };
      await ref.set(assignment);
      res.json({ success: true, assignment: { ...assignment, moduleCount: assignment.moduleIds.length } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/assignment-detail", async (req, res) => {
    const { assignmentId, teacherUid } = req.body;
    if (!assignmentId || !teacherUid) return res.status(400).json({ error: "assignmentId and teacherUid required" });
    try {
      const assignSnap = await adminDb.collection("assignments").doc(assignmentId).get();
      if (!assignSnap.exists) return res.status(404).json({ error: "Assignment not found" });
      const assignData = assignSnap.data()!;
      if (assignData.teacherUid !== teacherUid) return res.status(403).json({ error: "Not authorized" });

      const classSnap = await adminDb.collection("classrooms").doc(assignData.classroomId).get();
      const studentUids: string[] = classSnap.exists ? (classSnap.data()?.studentUids || []) : [];
      const submissions = assignData.submissions || {};
      const dueAt = new Date(assignData.dueAt);
      const now = new Date();

      const students = [];
      let completed = 0, inProgress = 0, notStarted = 0, late = 0;
      for (const uid of studentUids) {
        const userSnap = await adminDb.collection("users").doc(uid).get();
        const u = userSnap.exists ? userSnap.data()! : {};
        const sub = submissions[uid] || { status: "not_started", progress: 0 };
        const isLate = sub.status !== "completed" && dueAt < now;
        if (sub.status === "completed") completed++;
        else if (sub.status === "in_progress") inProgress++;
        else notStarted++;
        if (isLate) late++;
        students.push({
          uid, name: u.name || "Student", username: u.username, grade: u.grade,
          status: sub.status, progress: sub.progress || 0,
          submittedAt: sub.submittedAt, score: sub.score, isLate
        });
      }

      res.json({
        assignment: { ...assignData, moduleCount: (assignData.moduleIds || []).length },
        students,
        summary: { completed, inProgress, notStarted, late, total: studentUids.length }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/delete-assignment", async (req, res) => {
    const { assignmentId, teacherUid } = req.body;
    if (!assignmentId || !teacherUid) return res.status(400).json({ error: "assignmentId and teacherUid required" });
    try {
      const assignSnap = await adminDb.collection("assignments").doc(assignmentId).get();
      if (!assignSnap.exists) return res.status(404).json({ error: "Assignment not found" });
      if (assignSnap.data()?.teacherUid !== teacherUid) return res.status(403).json({ error: "Not authorized" });
      await adminDb.collection("assignments").doc(assignmentId).delete();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/student-classmates", async (req, res) => {
    const { studentUid } = req.body;
    if (!studentUid) return res.status(400).json({ error: "studentUid required" });
    try {
      const studentSnap = await adminDb.collection("users").doc(studentUid).get();
      if (!studentSnap.exists) return res.status(404).json({ error: "Student not found" });
      const classroomIds: string[] = studentSnap.data()?.classroomIds || [];
      const classroomId = classroomIds[0];
      if (!classroomId) return res.json({ classmates: [], classroomName: "" });

      const classSnap = await adminDb.collection("classrooms").doc(classroomId).get();
      const studentUids: string[] = classSnap.exists ? (classSnap.data()?.studentUids || []) : [];
      const classmates = [];
      for (const uid of studentUids) {
        if (uid === studentUid) continue;
        const userSnap = await adminDb.collection("users").doc(uid).get();
        if (!userSnap.exists) continue;
        const u = userSnap.data()!;
        classmates.push({ uid, name: u.name, username: u.username, grade: u.grade });
      }
      res.json({ classmates, classroomName: classSnap.data()?.name || "" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/student-assignments", async (req, res) => {
    const { studentUid } = req.body;
    if (!studentUid) return res.status(400).json({ error: "studentUid required" });
    try {
      const studentSnap = await adminDb.collection("users").doc(studentUid).get();
      if (!studentSnap.exists) return res.status(404).json({ error: "Student not found" });
      const classroomIds: string[] = studentSnap.data()?.classroomIds || [];
      const classroomId = classroomIds[0];
      if (!classroomId) return res.json({ assignments: [] });

      const snap = await adminDb.collection("assignments").where("classroomId", "==", classroomId).get();
      const now = new Date();
      const assignments = snap.docs.map(d => {
        const data = d.data();
        const sub = (data.submissions || {})[studentUid] || { status: "not_started", progress: 0 };
        const dueAt = new Date(data.dueAt);
        return {
          id: d.id,
          ...data,
          moduleCount: (data.moduleIds || []).length,
          mySubmission: sub,
          isLate: sub.status !== "completed" && dueAt < now
        };
      });
      res.json({ assignments });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /** Mark assignment started / module completed for a student (district path). */
  app.post("/api/update-assignment-progress", async (req, res) => {
    const { studentUid, assignmentId, moduleId, completedModuleId, score } = req.body;
    if (!studentUid) return res.status(400).json({ error: "studentUid required" });

    try {
      const studentSnap = await adminDb.collection("users").doc(studentUid).get();
      if (!studentSnap.exists) return res.status(404).json({ error: "Student not found" });
      const classroomIds: string[] = studentSnap.data()?.classroomIds || [];
      const classroomId = classroomIds[0];
      if (!classroomId) return res.json({ updated: [] });

      const targets: DocumentSnapshot[] = [];
      if (assignmentId) {
        const one = await adminDb.collection("assignments").doc(assignmentId).get();
        if (one.exists && one.data()?.classroomId === classroomId) targets.push(one);
      } else {
        const snap = await adminDb.collection("assignments").where("classroomId", "==", classroomId).get();
        for (const d of snap.docs) {
          const ids: string[] = d.data().moduleIds || [];
          const target = completedModuleId || moduleId;
          if (!target || ids.includes(target)) targets.push(d);
        }
      }

      const updated: { id: string; status: string; progress: number }[] = [];
      for (const d of targets) {
        const data = d.data()!;
        const moduleIds: string[] = data.moduleIds || [];
        if (moduleIds.length === 0) continue;

        const prev = data.submissions?.[studentUid] || { status: "not_started", progress: 0, completedModuleIds: [] };
        if (prev.status === "completed") {
          updated.push({ id: d.id, status: prev.status, progress: prev.progress || 100 });
          continue;
        }

        const minScore = data.minScore != null ? Number(data.minScore) : null;
        const next = computeNextAssignmentSubmission({
          prev,
          moduleIds,
          moduleId,
          completedModuleId,
          score: score != null ? Number(score) : undefined,
          minScore,
        });
        // Dot-notation updates only this student's entry, avoiding lost writes when
        // classmates update the same assignment document concurrently.
        await d.ref.update({ [`submissions.${studentUid}`]: next });
        updated.push({ id: d.id, status: next.status, progress: next.progress });
      }

      res.json({ updated });
    } catch (error: any) {
      console.error("Update assignment progress error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  /** Persist lesson/topic completion with sequential-order validation. */
  app.post("/api/update-learning-progress", async (req, res) => {
    const authUser = await verifyAuthHeader(req);
    const { studentUid, moduleId, lessonId, topicId, action } = req.body as {
      studentUid?: string;
      moduleId?: string;
      lessonId?: string;
      topicId?: string;
      action?: string;
    };

    const uid = studentUid || authUser?.uid;
    if (!uid) return res.status(401).json({ error: "Authentication required" });
    if (authUser && authUser.uid !== uid) {
      return res.status(403).json({ error: "Cannot update another student's progress" });
    }
    if (action !== "complete_topic" || !moduleId || !lessonId || !topicId) {
      return res.status(400).json({ error: "moduleId, lessonId, topicId, and action=complete_topic required" });
    }

    try {
      const studentRef = adminDb.collection("users").doc(uid);
      const studentSnap = await studentRef.get();
      if (!studentSnap.exists) return res.status(404).json({ error: "Student not found" });
      const studentData = studentSnap.data()!;
      if (studentData.role !== "student") {
        return res.status(403).json({ error: "Only students have learning progress" });
      }

      const prev: StudentLearningProgress = studentData.learningProgress || emptyProgress();
      const check = canCompleteTopicServer(prev, moduleId, lessonId, topicId);
      if (!check.ok) return res.status(400).json({ error: check.reason || "Cannot complete topic" });

      const next = applyTopicCompletionServer(prev, moduleId, lessonId, topicId);
      await studentRef.update({
        learningProgress: next,
        lastModuleId: moduleId,
        lastLessonId: lessonId,
        lastTopicId: topicId,
      });

      res.json({ success: true, learningProgress: next });
    } catch (error: any) {
      console.error("Update learning progress error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // STUDENT ↔ TEACHER QUESTIONS
  // ==========================================

  async function getStudentClassroom(studentUid: string) {
    const studentSnap = await adminDb.collection("users").doc(studentUid).get();
    if (!studentSnap.exists) return null;
    const classroomIds: string[] = studentSnap.data()?.classroomIds || [];
    const classroomId = classroomIds[0];
    if (!classroomId) return null;
    const classSnap = await adminDb.collection("classrooms").doc(classroomId).get();
    if (!classSnap.exists) return null;
    const classData = classSnap.data()!;
    return {
      student: studentSnap.data()!,
      classroomId,
      teacherUid: classData.teacherUid as string,
      classroomName: classData.name || ""
    };
  }

  function threadDocId(classroomId: string, studentUid: string) {
    return `${classroomId}_${studentUid}`;
  }

  function serializeThread(id: string, data: admin.firestore.DocumentData): Record<string, unknown> {
    return {
      id,
      classroomId: data.classroomId,
      studentUid: data.studentUid,
      teacherUid: data.teacherUid,
      studentName: data.studentName,
      status: data.status,
      teacherUnreadCount: data.teacherUnreadCount || 0,
      studentUnreadCount: data.studentUnreadCount || 0,
      messages: data.messages || [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
  }

  app.post("/api/student-ask-teacher", async (req, res) => {
    const { studentUid, text, message } = req.body;
    const bodyText = (text || message || "").trim();
    if (!studentUid || !bodyText) {
      return res.status(400).json({ error: "studentUid and text are required" });
    }
    try {
      const ctx = await getStudentClassroom(studentUid);
      if (!ctx) return res.status(403).json({ error: "Student is not in a district class" });

      const now = new Date().toISOString();
      const msg = { role: "student", text: bodyText, timestamp: now };
      const docId = threadDocId(ctx.classroomId, studentUid);
      const threadRef = adminDb.collection("class_questions").doc(docId);
      const existing = await threadRef.get();

      if (existing.exists) {
        const data = existing.data()!;
        const messages = [...(data.messages || []), msg];
        await threadRef.update({
          messages,
          status: data.status === "answered" ? "answered" : "open",
          teacherUnreadCount: (data.teacherUnreadCount || 0) + 1,
          updatedAt: now
        });
      } else {
        await threadRef.set({
          classroomId: ctx.classroomId,
          studentUid,
          teacherUid: ctx.teacherUid,
          studentName: ctx.student.name || ctx.student.username || "Student",
          status: "open",
          teacherUnreadCount: 1,
          studentUnreadCount: 0,
          messages: [msg],
          createdAt: now,
          updatedAt: now
        });
      }

      const updated = await threadRef.get();
      res.json({ thread: serializeThread(docId, updated.data()!) });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/student-teacher-thread", async (req, res) => {
    const { studentUid } = req.body;
    if (!studentUid) return res.status(400).json({ error: "studentUid required" });
    try {
      const ctx = await getStudentClassroom(studentUid);
      if (!ctx) return res.json({ thread: null, classroomName: "" });

      const docId = threadDocId(ctx.classroomId, studentUid);
      const threadSnap = await adminDb.collection("class_questions").doc(docId).get();
      if (!threadSnap.exists) {
        return res.json({ thread: null, classroomName: ctx.classroomName });
      }

      const data = threadSnap.data()!;
      if (data.studentUnreadCount > 0) {
        await threadSnap.ref.update({ studentUnreadCount: 0 });
        data.studentUnreadCount = 0;
      }

      res.json({
        thread: serializeThread(docId, data),
        classroomName: ctx.classroomName
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/student-notifications", async (req, res) => {
    const { studentUid } = req.body;
    if (!studentUid) return res.status(400).json({ error: "studentUid required" });
    try {
      const studentSnap = await adminDb.collection("users").doc(studentUid).get();
      if (!studentSnap.exists || studentSnap.data()?.role !== "student") {
        return res.status(403).json({ error: "Student not found" });
      }

      const ctx = await getStudentClassroom(studentUid);
      if (!ctx) return res.json({ unreadCount: 0, thread: null });

      const docId = threadDocId(ctx.classroomId, studentUid);
      const threadSnap = await adminDb.collection("class_questions").doc(docId).get();
      if (!threadSnap.exists) {
        return res.json({ unreadCount: 0, thread: null });
      }

      const data = threadSnap.data()!;
      const unreadCount = Number(data.studentUnreadCount) || 0;
      res.json({
        unreadCount,
        thread: serializeThread(docId, data)
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/teacher-notifications", async (req, res) => {
    const { teacherUid } = req.body;
    if (!teacherUid) return res.status(400).json({ error: "teacherUid required" });
    try {
      const teacherSnap = await adminDb.collection("users").doc(teacherUid).get();
      if (!teacherSnap.exists || teacherSnap.data()?.role !== "teacher") {
        return res.status(403).json({ error: "Teacher not found" });
      }

      const snap = await adminDb.collection("class_questions")
        .where("teacherUid", "==", teacherUid)
        .get();

      const threads = snap.docs
        .map(d => serializeThread(d.id, d.data()))
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

      const unreadCount = threads.reduce(
        (sum, t) => sum + (Number(t.teacherUnreadCount) || 0),
        0
      );

      res.json({ unreadCount, threads });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Backward-compatible alias for nav badge polling
  app.post("/api/teacher-class-notifications", async (req, res) => {
    const { teacherUid } = req.body;
    if (!teacherUid) return res.status(400).json({ error: "teacherUid required" });
    try {
      const teacherSnap = await adminDb.collection("users").doc(teacherUid).get();
      if (!teacherSnap.exists || teacherSnap.data()?.role !== "teacher") {
        return res.status(403).json({ error: "Teacher not found" });
      }

      const snap = await adminDb.collection("class_questions")
        .where("teacherUid", "==", teacherUid)
        .get();

      const threads = snap.docs.map(d => serializeThread(d.id, d.data()));
      const unreadCount = threads.reduce(
        (sum, t) => sum + (Number(t.teacherUnreadCount) || 0),
        0
      );

      res.json({ unreadCount, threads });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/teacher-reply", async (req, res) => {
    const { teacherUid, threadId, text } = req.body;
    if (!teacherUid || !threadId || !text?.trim()) {
      return res.status(400).json({ error: "teacherUid, threadId, and text are required" });
    }
    try {
      const threadRef = adminDb.collection("class_questions").doc(threadId);
      const threadSnap = await threadRef.get();
      if (!threadSnap.exists) return res.status(404).json({ error: "Thread not found" });

      const data = threadSnap.data()!;
      if (data.teacherUid !== teacherUid) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const now = new Date().toISOString();
      const message = { role: "teacher", text: text.trim(), timestamp: now };
      const messages = [...(data.messages || []), message];

      await threadRef.update({
        messages,
        status: "answered",
        teacherUnreadCount: 0,
        studentUnreadCount: (data.studentUnreadCount || 0) + 1,
        updatedAt: now
      });

      const updated = await threadRef.get();
      res.json({ thread: serializeThread(threadId, updated.data()!) });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/teacher-mark-thread-read", async (req, res) => {
    const { teacherUid, threadId } = req.body;
    if (!teacherUid || !threadId) {
      return res.status(400).json({ error: "teacherUid and threadId required" });
    }
    try {
      const threadRef = adminDb.collection("class_questions").doc(threadId);
      const threadSnap = await threadRef.get();
      if (!threadSnap.exists) return res.status(404).json({ error: "Thread not found" });
      if (threadSnap.data()?.teacherUid !== teacherUid) {
        return res.status(403).json({ error: "Not authorized" });
      }
      await threadRef.update({ teacherUnreadCount: 0 });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/teacher-reset-password", async (req, res) => {
    const { teacherUid, studentUid, newPassword } = req.body;
    if (!teacherUid || !studentUid) return res.status(400).json({ error: "teacherUid and studentUid required" });
    try {
      const teacherSnap = await adminDb.collection("users").doc(teacherUid).get();
      if (!teacherSnap.exists || teacherSnap.data()?.role !== "teacher") {
        return res.status(403).json({ error: "Teacher not found" });
      }
      const classroomIds: string[] = teacherSnap.data()?.classroomIds || [];
      let authorized = false;
      for (const cid of classroomIds) {
        const classSnap = await adminDb.collection("classrooms").doc(cid).get();
        if (classSnap.exists && (classSnap.data()?.studentUids || []).includes(studentUid)) {
          authorized = true;
          break;
        }
      }
      if (!authorized) return res.status(403).json({ error: "Student not in your class" });

      const password = newPassword || "Sandbox123!";
      await adminAuth.updateUser(studentUid, { password });
      await adminDb.collection("users").doc(studentUid).update({ demoPassword: password });
      res.json({ success: true, password });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/class-test-analytics", async (req, res) => {
    const { classroomId } = req.body;
    if (!classroomId) return res.status(400).json({ error: "classroomId required" });
    try {
      const classSnap = await adminDb.collection("classrooms").doc(classroomId).get();
      if (!classSnap.exists) return res.status(404).json({ error: "Classroom not found" });
      const studentUids: string[] = classSnap.data()?.studentUids || [];
      let totalScore = 0;
      let testsTaken = 0;
      const missCounts: Record<string, number> = {};

      for (const uid of studentUids) {
        const resultsSnap = await adminDb.collection("results").doc(uid).get();
        const results = resultsSnap.exists ? (resultsSnap.data()?.results || []) : [];
        for (const r of results) {
          totalScore += r.score || 0;
          testsTaken++;
          for (const ans of (r.answers || [])) {
            if (!ans.correct) {
              const key = ans.questionText || ans.questionId;
              missCounts[key] = (missCounts[key] || 0) + 1;
            }
          }
        }
      }

      const frequentMisses = Object.entries(missCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([question, count]) => ({ question, count }));

      res.json({
        classAverage: testsTaken ? Math.round(totalScore / testsTaken) : 0,
        testsTaken,
        frequentMisses
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // DISTRICT ROSTER SYNC (CSV import)
  // ==========================================
  const DEFAULT_ROSTER_PASSWORD = "Sandbox123!";

  async function getOrCreateDistrictAuthUser(
    email: string,
    password: string,
    name: string,
    role: "student" | "teacher" | "parent" = "student"
  ) {
    try {
      const uid = (await adminAuth.getUserByEmail(email)).uid;
      await syncAuthUserRoleLabels(adminAuth, uid, role, name);
      return uid;
    } catch {
      const created = await createAuthUserWithRoleLabels(adminAuth, { email, password, role, name });
      return created.uid;
    }
  }

  function slugUsername(name: string, email: string): string {
    const fromName = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const fromEmail = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]+/g, "_");
    return (fromName || fromEmail || "student").slice(0, 32);
  }

  async function addStudentToAssignmentSubmissions(classroomId: string, studentUid: string) {
    const assignSnap = await adminDb.collection("assignments").where("classroomId", "==", classroomId).get();
    for (const d of assignSnap.docs) {
      const subs = d.data().submissions || {};
      if (subs[studentUid]) continue;
      await d.ref.update({
        [`submissions.${studentUid}`]: { status: "not_started", progress: 0, completedModuleIds: [] },
      });
    }
  }

  app.post("/api/sync-class-roster", async (req, res) => {
    const { classroomId, teacherUid, rows } = req.body as {
      classroomId?: string;
      teacherUid?: string;
      rows?: { name?: string; email?: string; grade?: string; username?: string; parentEmail?: string }[];
    };
    if (!classroomId || !teacherUid || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "classroomId, teacherUid, and rows[] required" });
    }

    try {
      const [teacherSnap, classSnap] = await Promise.all([
        adminDb.collection("users").doc(teacherUid).get(),
        adminDb.collection("classrooms").doc(classroomId).get(),
      ]);
      if (!teacherSnap.exists || teacherSnap.data()?.role !== "teacher") {
        return res.status(403).json({ error: "Teacher not found" });
      }
      if (!classSnap.exists) return res.status(404).json({ error: "Classroom not found" });
      const classData = classSnap.data()!;
      if (classData.teacherUid !== teacherUid) {
        return res.status(403).json({ error: "Not your classroom" });
      }

      const districtId = classData.districtId || teacherSnap.data()?.districtId;
      const existingUids: string[] = classData.studentUids || [];
      const added: string[] = [];
      const linked: string[] = [];
      const parentsProvisioned: string[] = [];
      const skipped: string[] = [];
      const errors: { email: string; error: string }[] = [];

      for (const row of rows) {
        const name = (row.name || "").trim();
        const email = (row.email || "").trim().toLowerCase();
        const parentEmail = (row.parentEmail || "").trim().toLowerCase();
        if (!name || !email) {
          skipped.push(email || name || "(blank row)");
          continue;
        }

        try {
          let uid: string;
          try {
            uid = (await adminAuth.getUserByEmail(email)).uid;
            await syncAuthUserRoleLabels(adminAuth, uid, "student", name);
          } catch {
            uid = await getOrCreateDistrictAuthUser(email, DEFAULT_ROSTER_PASSWORD, name, "student");
          }

          const username = (row.username || slugUsername(name, email)).slice(0, 32);
          const grade = row.grade || classData.grade || teacherSnap.data()?.grade || "7";

          await adminDb.collection("users").doc(uid).set({
            uid,
            name,
            username,
            email,
            role: "student",
            path: "district",
            grade,
            xp: 0,
            isFirstTime: true,
            isPaid: true,
            districtId,
            classroomIds: [classroomId],
            teacherUid,
            demoPassword: DEFAULT_ROSTER_PASSWORD,
            ...(parentEmail ? { parentEmail } : {}),
            createdAt: new Date().toISOString(),
          }, { merge: true });

          if (!existingUids.includes(uid)) {
            existingUids.push(uid);
            await classSnap.ref.update({ studentUids: existingUids });
            await addStudentToAssignmentSubmissions(classroomId, uid);
            added.push(uid);
          } else {
            linked.push(uid);
          }

          if (parentEmail) {
            const parentResult = await provisionParentForStudent(adminAuth, adminDb, sendValleyScienceEmail, {
              studentUid: uid,
              studentName: name,
              parentEmail,
              studentGrade: grade,
              path: "district",
              districtId,
              initialPassword: DEFAULT_ROSTER_PASSWORD,
            });
            parentsProvisioned.push(parentResult.parentUid);
          }
        } catch (err: any) {
          errors.push({ email, error: err.message });
        }
      }

      res.json({ success: true, added, linked, parentsProvisioned, skipped, errors });
    } catch (error: any) {
      console.error("Roster sync error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/demo-feedback", async (req, res) => {
    const { email, uid } = req.body;
    try {
      const feedbackUrl = process.env.DEMO_FEEDBACK_URL || "https://forms.gle/demo-feedback";
      if (email) {
        await sendValleyScienceEmail({
          to: email,
          subject: "How was your Valley Science demo?",
          html: `<div style="font-family:sans-serif;padding:20px;"><h2>Thanks for trying Valley Science!</h2><p>Your demo has ended. We'd love your feedback:</p><a href="${feedbackUrl}">Share Feedback</a></div>`,
          text: `Thanks for trying Valley Science! Share feedback: ${feedbackUrl}`,
          context: "demo-feedback"
        });
      }
      if (uid) await adminDb.collection("users").doc(uid).update({ demoFeedbackSent: true });
      res.json({ success: true, feedbackUrl });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // DISTRICT SANDBOX SEED
  // ==========================================
  const SANDBOX_VERSION = 2;
  const SANDBOX_TEACHER_EMAIL = "sandbox.teacher@valley-science.demo";
  const SANDBOX_PASSWORD = "Sandbox123!";
  const SANDBOX_STUDENT_EMAIL = "sandbox.student1@valley-science.demo";
  const SANDBOX_PARENT_EMAIL = "sandbox.parent@valley-science.demo";
  const SANDBOX_FAKE_NAMES = ["Alex M.", "Jordan K.", "Sam R.", "Taylor L.", "Casey P.", "Riley N.", "Morgan B.", "Quinn D."];
  let sandboxSeedInFlight: Promise<void> | null = null;

  function sandboxSeedResponse(alreadySeeded = false) {
    return {
      success: true,
      alreadySeeded,
      teacherEmail: SANDBOX_TEACHER_EMAIL,
      password: SANDBOX_PASSWORD,
      studentEmail: SANDBOX_STUDENT_EMAIL,
      studentPassword: SANDBOX_PASSWORD,
      parentEmail: SANDBOX_PARENT_EMAIL,
      parentPassword: SANDBOX_PASSWORD,
    };
  }

  async function getOrCreateSandboxAuthUser(
    email: string,
    password: string,
    name: string,
    role: "student" | "teacher" | "parent" = "student"
  ) {
    try {
      const uid = (await adminAuth.getUserByEmail(email)).uid;
      await syncAuthUserRoleLabels(adminAuth, uid, role, name);
      return uid;
    } catch {
      const created = await createAuthUserWithRoleLabels(adminAuth, { email, password, role, name });
      return created.uid;
    }
  }

  async function runFullSandboxSeed() {
    const teacherUid = await getOrCreateSandboxAuthUser(
      SANDBOX_TEACHER_EMAIL,
      SANDBOX_PASSWORD,
      "Sandbox Teacher",
      "teacher"
    );

    await adminDb.collection("users").doc(teacherUid).set({
      uid: teacherUid, name: "Sandbox Teacher", username: "sandbox_teacher", email: SANDBOX_TEACHER_EMAIL,
      role: "teacher", path: "district", grade: "7", xp: 0, isFirstTime: false, isPaid: true,
      districtId: "sandbox-district", classroomIds: ["sandbox-class-1"], demoPassword: SANDBOX_PASSWORD,
      createdAt: new Date().toISOString()
    }, { merge: true });

    await adminDb.collection("districts").doc("sandbox-district").set({
      id: "sandbox-district", name: "Sandbox District", adminUid: "sandbox-admin", settings: {}
    }, { merge: true });

    const studentUids = await Promise.all(SANDBOX_FAKE_NAMES.map(async (name, i) => {
      const email = `sandbox.student${i + 1}@valley-science.demo`;
      const uid = await getOrCreateSandboxAuthUser(email, SANDBOX_PASSWORD, name, "student");

      await adminDb.collection("users").doc(uid).set({
        uid, name, username: `sandbox_s${i + 1}`, email,
        role: "student", path: "district", grade: "7", xp: 0, isFirstTime: false, isPaid: true,
        districtId: "sandbox-district", classroomIds: ["sandbox-class-1"], teacherUid, demoPassword: SANDBOX_PASSWORD,
        createdAt: new Date().toISOString()
      }, { merge: true });

      const resultsRef = adminDb.collection("results").doc(uid);
      const existingResults = await resultsRef.get();
      if (!existingResults.exists) {
        const score = 55 + (i * 7) % 40;
        await resultsRef.set({
          results: [{
            id: `sandbox-${i}`, userId: uid, type: "placement", score, gaps: ["Cell Theory"],
            timestamp: new Date().toISOString(),
            answers: [
              { questionId: "7-b1", questionText: "Which organelle is the powerhouse?", selectedAnswer: "Nucleus", correct: false, concept: "Cell Organelles" },
              { questionId: "7-b2", questionText: "What is the primary function of DNA?", selectedAnswer: "Store genetic information", correct: true, concept: "Genetics" }
            ]
          }]
        });
        await adminDb.collection("stats").doc(uid).set({
          totalSeconds: 1200 + i * 300,
          lastUpdated: new Date().toISOString()
        });
      }

      return uid;
    }));

    const sandboxStudent1Uid = studentUids[0];
    const parentUid = await getOrCreateSandboxAuthUser(
      SANDBOX_PARENT_EMAIL,
      SANDBOX_PASSWORD,
      "Parent of Alex M.",
      "parent"
    );
    await adminDb.collection("users").doc(parentUid).set({
      uid: parentUid,
      name: "Parent of Alex M.",
      username: "sandbox_parent",
      email: SANDBOX_PARENT_EMAIL,
      role: "parent",
      path: "district",
      grade: "7",
      xp: 0,
      isFirstTime: false,
      isPaid: true,
      districtId: "sandbox-district",
      linkedStudentUid: sandboxStudent1Uid,
      linkedStudentUids: [sandboxStudent1Uid],
      activeStudentUid: sandboxStudent1Uid,
      demoPassword: SANDBOX_PASSWORD,
      createdAt: new Date().toISOString(),
    }, { merge: true });
    await adminDb.collection("users").doc(sandboxStudent1Uid).set({
      parentUid,
      parentEmail: SANDBOX_PARENT_EMAIL,
    }, { merge: true });

    await adminDb.collection("classrooms").doc("sandbox-class-1").set({
      id: "sandbox-class-1", name: "Period 3 — Grade 7", teacherUid, districtId: "sandbox-district", grade: "7", studentUids
    }, { merge: true });

    const futureDue = new Date();
    futureDue.setDate(futureDue.getDate() + 7);
    const pastDue = new Date();
    pastDue.setDate(pastDue.getDate() - 3);

    const buildSubmissions = (offset: number) => {
      const subs: Record<string, { status: string; progress: number; submittedAt?: string; score?: number }> = {};
      studentUids.forEach((uid, i) => {
        const mod = (i + offset) % 3;
        if (mod === 0) {
          subs[uid] = { status: "completed", progress: 100, submittedAt: new Date().toISOString(), score: 70 + (i % 25) };
        } else if (mod === 1) {
          subs[uid] = { status: "in_progress", progress: 25 + (i * 11) % 60 };
        } else {
          subs[uid] = { status: "not_started", progress: 0 };
        }
      });
      return subs;
    };

    await Promise.all([
      adminDb.collection("assignments").doc("sandbox-assign-current").set({
        id: "sandbox-assign-current", classroomId: "sandbox-class-1", teacherUid,
        title: "Cell Structure Module", dueAt: futureDue.toISOString(), grade: "7",
        minScore: 70, moduleIds: ["8-1-1", "8-1-2"], submissions: buildSubmissions(0),
        createdAt: new Date().toISOString()
      }, { merge: true }),
      adminDb.collection("assignments").doc("sandbox-assign-past").set({
        id: "sandbox-assign-past", classroomId: "sandbox-class-1", teacherUid,
        title: "Ecosystems Unit Review", dueAt: pastDue.toISOString(), grade: "7",
        minScore: 65, moduleIds: ["5-1-1"], submissions: buildSubmissions(1),
        createdAt: new Date(Date.now() - 14 * 86400000).toISOString()
      }, { merge: true }),
    ]);

    await adminDb.collection("sandbox_meta").doc("district").set({
      version: SANDBOX_VERSION,
      seededAt: new Date().toISOString(),
      teacherUid,
      classroomId: "sandbox-class-1",
    });
  }

  async function ensureSandboxSeeded() {
    const metaRef = adminDb.collection("sandbox_meta").doc("district");
    const metaSnap = await metaRef.get();
    if (metaSnap.exists && metaSnap.data()?.version === SANDBOX_VERSION) {
      return;
    }

    if (!sandboxSeedInFlight) {
      sandboxSeedInFlight = runFullSandboxSeed().finally(() => {
        sandboxSeedInFlight = null;
      });
    }
    await sandboxSeedInFlight;
  }

  app.post("/api/seed-sandbox", async (_req, res) => {
    try {
      const metaRef = adminDb.collection("sandbox_meta").doc("district");
      const metaSnap = await metaRef.get();
      let alreadySeeded = metaSnap.exists && metaSnap.data()?.version === SANDBOX_VERSION;

      if (!alreadySeeded) {
        const classSnap = await adminDb.collection("classrooms").doc("sandbox-class-1").get();
        if (classSnap.exists) {
          const classData = classSnap.data()!;
          await metaRef.set({
            version: SANDBOX_VERSION,
            seededAt: new Date().toISOString(),
            teacherUid: classData.teacherUid,
            classroomId: "sandbox-class-1",
            migrated: true,
          });
          alreadySeeded = true;
        }
      }

      if (!alreadySeeded) {
        await ensureSandboxSeeded();
      }

      res.json(sandboxSeedResponse(alreadySeeded));
    } catch (error: any) {
      console.error("Sandbox seed error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // ADMIN: Backfill Auth displayName + role claims from Firestore
  // ==========================================
  app.post("/api/admin/backfill-auth-role-labels", async (req, res) => {
    if (!verifyCronSecret(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!process.env.CRON_SECRET) {
      return res.status(503).json({ error: "CRON_SECRET is not configured" });
    }

    try {
      const dryRun = req.query.dryRun === "1" || req.body?.dryRun === true;
      const result = await backfillAuthRoleLabelsFromFirestore(adminAuth, adminDb, { dryRun });
      res.json({ ok: true, dryRun, ...result });
    } catch (error: any) {
      console.error("Auth role label backfill error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // In production, serve the built frontend
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(__dirname, "../frontend/dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Valley Science backend running on http://localhost:${PORT}`);
    for (const iface of Object.values(os.networkInterfaces())) {
      for (const net of iface ?? []) {
        if (net.family === "IPv4" && !net.internal) {
          console.log(`  Network: http://${net.address}:${PORT}`);
        }
      }
    }
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\nPort ${PORT} is already in use. Another backend is likely already running.`);
      console.error(`  • Check other terminals for "Valley Science backend running"`);
      console.error(`  • Or run: lsof -i :${PORT}   then: kill <PID>`);
      console.error(`  • Test if it's up: curl http://localhost:${PORT}/api/health\n`);
      process.exit(1);
    }
    throw err;
  });
}

startServer();
