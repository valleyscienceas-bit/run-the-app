import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import crypto from "crypto";
import { getSocraticResponse } from "./services/gemini.js";

dotenv.config();

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

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3001;

  app.use(express.json());

  // CORS for local frontend dev
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:3000");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });

  // ==========================================
  // VERIFICATION CODE ROUTES (10-min expiry)
  // ==========================================
  app.post("/api/send-verification-code", async (req, res) => {
    const { email, purpose = "signup" } = req.body;
    if (!email) return res.status(400).json({ error: "email is required" });

    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const hash = emailHash(email);

      await adminDb.collection("verification_codes").doc(hash).set({
        code,
        email: email.toLowerCase().trim(),
        purpose,
        expiresAt,
        createdAt: new Date().toISOString()
      });

      const html = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0f172a;">Welcome to Valley Science!</h2>
          <p>Your verification code is:</p>
          <div style="font-size: 32px; font-weight: bold; color: #ec4899; margin: 20px 0;">${code}</div>
          <p style="color: #64748b; font-size: 14px;">This code expires in 10 minutes.</p>
        </div>
      `;

      if (process.env.SMTP_USER) {
        const transporter = await getMailTransporter();
        await transporter.sendMail({
          from: `"Valley Science" <${process.env.SMTP_USER}>`,
          to: email,
          subject: "Your Valley Science Verification Code",
          text: `Your verification code is: ${code}. It expires in 10 minutes.`,
          html
        });
      } else {
        console.log(`[VERIFY] Code for ${email}: ${code} (expires ${expiresAt})`);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Send verification code error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/verify-code", async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: "email and code are required" });

    try {
      const hash = emailHash(email);
      const snap = await adminDb.collection("verification_codes").doc(hash).get();
      if (!snap.exists) return res.status(400).json({ error: "No verification code found. Please request a new one." });

      const data = snap.data()!;
      if (new Date(data.expiresAt) < new Date()) {
        await snap.ref.delete();
        return res.status(400).json({ error: "Verification code has expired. Please request a new one." });
      }
      if (data.code !== code) {
        return res.status(400).json({ error: "Invalid verification code." });
      }

      await snap.ref.delete();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Verify code error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // SOCRATIC AI ROUTE
  // ==========================================
  app.post("/api/chat", async (req, res) => {
    const { history, message, moduleContext } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    try {
      const messages = history && history.length > 0
        ? [...history, { role: "user", text: message }]
        : [{ role: "user", text: message }];

      const response = await getSocraticResponse(messages, moduleContext);
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
    const { studentUid, studentName, parentEmail, studentGrade } = req.body;

    if (!studentUid || !parentEmail) {
      return res.status(400).json({ error: "studentUid and parentEmail are required" });
    }

    try {
      const parentDocId = `parent_${studentUid}`;

      // 1. Check if parent Auth user already exists
      let parentAuthUid: string;
      try {
        const existingUser = await adminAuth.getUserByEmail(parentEmail);
        parentAuthUid = existingUser.uid;
      } catch (err: any) {
        if (err.code === "auth/user-not-found") {
          // Create real Firebase Auth user for the parent
          const newUser = await adminAuth.createUser({
            email: parentEmail,
            emailVerified: false,
            displayName: `Parent of ${studentName || "Student"}`,
            password: Math.random().toString(36).slice(-12) + "A1!"
          });
          parentAuthUid = newUser.uid;
          console.log(`[PROVISION] Created Auth user for parent: ${parentEmail}`);
        } else {
          throw err;
        }
      }

      // 2. Create or update parent Firestore profile stored at Auth UID (so login works)
      const parentProfile = {
        uid: parentAuthUid,
        linkedStudentUid: studentUid,
        name: `Parent of ${studentName || "Student"}`,
        username: `parent_${studentUid.slice(-6)}`,
        email: parentEmail,
        role: "parent",
        path: "individual",
        grade: studentGrade || "6",
        xp: 0,
        isFirstTime: true,
        isPaid: true,
        createdAt: new Date().toISOString()
      };

      // Store at Auth UID so onAuthStateChanged can find it directly
      await adminDb.collection("users").doc(parentAuthUid).set(parentProfile, { merge: true });
      // Also keep legacy doc for backward compatibility
      await adminDb.collection("users").doc(parentDocId).set({ ...parentProfile, uid: parentDocId, authUid: parentAuthUid }, { merge: true });
      console.log(`[PROVISION] Created/updated parent profile at Auth UID: ${parentAuthUid}`);

      // 3. Generate password reset link so parent can set their own password
      const resetLink = await adminAuth.generatePasswordResetLink(parentEmail);

      // 4. Send branded welcome email with direct set-password button
      const transporter = nodemailer.createTransport({
        service: process.env.SMTP_SERVICE,
        host: process.env.SMTP_HOST || "smtp.ethereal.email",
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { rejectUnauthorized: false }
      });

      const emailHtml = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 520px;">
          <h2 style="color: #0f172a;">Your Valley Science Parent Account is Ready</h2>
          <p>A parent monitoring account has been created for you to track <strong>${studentName || "your student"}'s</strong> science progress.</p>
          <p>Click the button below to set your password and access your dashboard:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background: #ec4899; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 16px;">Set Your Password</a>
          </div>
          <div style="background: #f8fafc; padding: 16px; border-radius: 10px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #475569;"><strong>To log in after setting your password:</strong></p>
            <ol style="font-size: 14px; color: #475569; margin: 8px 0 0;">
              <li>Go to the Valley Science login page</li>
              <li>Select <strong>Individual Access → Parent</strong></li>
              <li>Enter your email: <strong>${parentEmail}</strong></li>
            </ol>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">If you didn't expect this email, you can safely ignore it.</p>
          <p style="color: #94a3b8; font-size: 13px;">If the button doesn't work, copy this link: <a href="${resetLink}">${resetLink}</a></p>
        </div>
      `;

      if (process.env.SMTP_USER) {
        await transporter.sendMail({
          from: `"Valley Science" <${process.env.SMTP_USER}>`,
          to: parentEmail,
          subject: `${studentName || "Your student"} just joined Valley Science — Set up your parent account`,
          html: emailHtml
        });
        console.log(`[PROVISION] Sent parent welcome email to ${parentEmail}`);
      } else {
        console.log("--- SIMULATED PARENT WELCOME EMAIL ---");
        console.log(`To: ${parentEmail}`);
        console.log(`Reset Link: ${resetLink}`);
        console.log("--------------------------------------");
      }

      res.json({ success: true, parentDocId });
    } catch (error: any) {
      console.error("Parent provisioning error:", error);
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
      const linkedStudents: { uid: string; name: string; grade?: string; username: string }[] = [];
      for (const uid of linkedUids) {
        const snap = await adminDb.collection("users").doc(uid).get();
        if (snap.exists) {
          const d = snap.data()!;
          linkedStudents.push({ uid, name: d.name, grade: d.grade, username: d.username });
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
      const transporter = nodemailer.createTransport({
        service: process.env.SMTP_SERVICE,
        host: process.env.SMTP_HOST || "smtp.ethereal.email",
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      if (!process.env.SMTP_USER) {
        console.log("--- SIMULATED EMAIL ---");
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body: ${text || "HTML Content"}`);
        console.log("-----------------------");
        return res.json({ success: true, message: "Email simulated (no SMTP config)" });
      }

      await transporter.sendMail({
        from: `"Valley Science" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
      });

      res.json({ success: true });
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
        await adminAuth.createUser({
          email,
          emailVerified: true,
          displayName: userData.name || "Parent User",
          password: Math.random().toString(36).slice(-12) + "A1!"
        });
        console.log(`[AUTH-SYSTEM] Created new Auth user for activation: ${email}`);
      }

      // 4. Generate a password reset link
      const resetLink = await adminAuth.generatePasswordResetLink(email);

      // 5. Send branded activation/reset email
      const transporter = nodemailer.createTransport({
        service: process.env.SMTP_SERVICE,
        host: process.env.SMTP_HOST || "smtp.ethereal.email",
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: { rejectUnauthorized: false }
      });

      const emailHtml = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0f172a;">Valley Science Account Access</h2>
          <p>Hello,</p>
          <p>We received a request to access or reset the password for your Valley Science account.</p>
          <p>To set your password and access your dashboard, please click the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background: #ec4899; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Set Your Password</a>
          </div>
          <p style="color: #64748b; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
          <p style="color: #64748b; font-size: 14px;">If the button doesn't work, copy and paste this link: <br/> <a href="${resetLink}">${resetLink}</a></p>
        </div>
      `;

      if (process.env.SMTP_USER) {
        await transporter.sendMail({
          from: `"Valley Science" <${process.env.SMTP_USER}>`,
          to: email,
          subject: "Access Your Valley Science Account",
          html: emailHtml
        });
        console.log(`[AUTH-SYSTEM] Sent branded reset link to ${email}`);
      } else {
        console.log("--- SIMULATED BRANDED RESET EMAIL ---");
        console.log(`To: ${email}`);
        console.log(`Link: ${resetLink}`);
        console.log("-------------------------------------");
      }

      res.json({ success: true, message: "Account verification email sent." });
    } catch (error: any) {
      console.error("Parent activation/reset error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // DEMO REQUEST / APPROVE ROUTES
  // ==========================================
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "valley.science.as@gmail.com";
  const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

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
      const html = `
        <div style="font-family:sans-serif;padding:20px;">
          <h2>New Demo Request</h2>
          <p><strong>${name}</strong> (${email}) wants a demo.</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <a href="${approveUrl}" style="background:#ec4899;color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;display:inline-block;margin-top:20px;">Approve Demo</a>
        </div>`;

      if (process.env.SMTP_USER) {
        const transporter = await getMailTransporter();
        await transporter.sendMail({ from: `"Valley Science" <${process.env.SMTP_USER}>`, to: ADMIN_EMAIL, subject: `Demo Request: ${name}`, html });
      } else {
        console.log(`[DEMO] Approve URL: ${approveUrl}`);
      }
      res.json({ success: true });
    } catch (error: any) {
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
      if (data.status === "approved") return res.redirect(`${APP_BASE_URL}?demo=already`);

      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const demoEmail = data.email;
      const tempPassword = crypto.randomBytes(8).toString("hex") + "A1!";

      // Create demo student
      let studentUid: string;
      try {
        const existing = await adminAuth.getUserByEmail(demoEmail);
        studentUid = existing.uid;
      } catch {
        const u = await adminAuth.createUser({ email: demoEmail, password: tempPassword, displayName: data.name });
        studentUid = u.uid;
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
      } catch {
        const p = await adminAuth.createUser({ email: parentEmail, password: tempPassword, displayName: `Parent of ${data.name}` });
        parentUid = p.uid;
      }
      await adminDb.collection("users").doc(parentUid).set({
        uid: parentUid, linkedStudentUid: studentUid, linkedStudentUids: [studentUid], activeStudentUid: studentUid,
        name: `Parent of ${data.name}`, username: `demo_parent_${studentUid.slice(-6)}`, email: parentEmail,
        role: "parent", path: "individual", grade: "7", xp: 0, isFirstTime: false, isPaid: true,
        isDemo: true, demoExpiresAt: expiresAt, demoStudentUid: studentUid, createdAt: new Date().toISOString()
      }, { merge: true });

      await adminDb.collection("users").doc(studentUid).set({ demoParentUid: parentUid }, { merge: true });

      await doc.ref.update({ status: "approved", approvedAt: new Date().toISOString(), expiresAt, demoStudentUid: studentUid, demoParentUid: parentUid });

      if (process.env.SMTP_USER) {
        const transporter = await getMailTransporter();
        await transporter.sendMail({
          from: `"Valley Science" <${process.env.SMTP_USER}>`, to: demoEmail,
          subject: "Your Valley Science Demo is Ready!",
          html: `<div style="font-family:sans-serif;padding:20px;"><h2>Demo Approved!</h2><p>Log in at ${APP_BASE_URL} with:</p><p>Email: <strong>${demoEmail}</strong></p><p>Password: <strong>${tempPassword}</strong></p><p>Access expires in 48 hours.</p><a href="${APP_BASE_URL}">Start Demo</a></div>`
        });
      }
      res.redirect(`${APP_BASE_URL}?demo=approved`);
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
      await adminDb.collection("users").doc(studentUid).update({
        grade: newGrade,
        gradeOverrides: admin.firestore.FieldValue.arrayUnion({ grade: newGrade, at: new Date().toISOString(), by: parentUid })
      });
      await adminDb.collection("users").doc(parentUid).update({ activeStudentUid: studentUid });
      res.json({ success: true });
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
    try {
      const parentSnap = await adminDb.collection("users").doc(parentUid).get();
      if (!parentSnap.exists || parentSnap.data()?.role !== "parent") return res.status(403).json({ error: "Not a parent account" });

      const userCred = await adminAuth.createUser({ email, password, displayName: name });
      const studentUid = userCred.uid;
      const parentData = parentSnap.data()!;

      await adminDb.collection("users").doc(studentUid).set({
        uid: studentUid, name, username: username || `student_${studentUid.slice(-6)}`, email,
        parentUid, parentEmail: parentData.email, role: "student", path: "individual",
        grade: grade || "6", xp: 0, isFirstTime: true, isPaid: parentData.isPaid, createdAt: new Date().toISOString()
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
    try {
      const ref = adminDb.collection("assignments").doc();
      const assignment = {
        id: ref.id, classroomId, teacherUid, title, dueAt, grade: grade || "7",
        minScore: minScore || null, moduleIds: moduleIds || [], createdAt: new Date().toISOString()
      };
      await ref.set(assignment);
      res.json({ success: true, assignment: { ...assignment, moduleCount: assignment.moduleIds.length } });
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

  app.post("/api/demo-feedback", async (req, res) => {
    const { email, uid } = req.body;
    try {
      const feedbackUrl = process.env.DEMO_FEEDBACK_URL || "https://forms.gle/demo-feedback";
      if (process.env.SMTP_USER && email) {
        const transporter = await getMailTransporter();
        await transporter.sendMail({
          from: `"Valley Science" <${process.env.SMTP_USER}>`, to: email,
          subject: "How was your Valley Science demo?",
          html: `<div style="font-family:sans-serif;padding:20px;"><h2>Thanks for trying Valley Science!</h2><p>Your demo has ended. We'd love your feedback:</p><a href="${feedbackUrl}">Share Feedback</a></div>`
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
  app.post("/api/seed-sandbox", async (_req, res) => {
    try {
      const teacherEmail = "sandbox.teacher@valley-science.demo";
      const password = "Sandbox123!";
      let teacherUid: string;
      try {
        teacherUid = (await adminAuth.getUserByEmail(teacherEmail)).uid;
      } catch {
        teacherUid = (await adminAuth.createUser({ email: teacherEmail, password, displayName: "Sandbox Teacher" })).uid;
      }
      await adminDb.collection("users").doc(teacherUid).set({
        uid: teacherUid, name: "Sandbox Teacher", username: "sandbox_teacher", email: teacherEmail,
        role: "teacher", path: "district", grade: "7", xp: 0, isFirstTime: false, isPaid: true,
        districtId: "sandbox-district", classroomIds: ["sandbox-class-1"], createdAt: new Date().toISOString()
      }, { merge: true });

      await adminDb.collection("districts").doc("sandbox-district").set({
        id: "sandbox-district", name: "Sandbox District", adminUid: "sandbox-admin", settings: {}
      }, { merge: true });

      const studentUids: string[] = [];
      const fakeNames = ["Alex M.", "Jordan K.", "Sam R.", "Taylor L.", "Casey P.", "Riley N.", "Morgan B.", "Quinn D."];
      for (let i = 0; i < fakeNames.length; i++) {
        const email = `sandbox.student${i + 1}@valley-science.demo`;
        let uid: string;
        try {
          uid = (await adminAuth.getUserByEmail(email)).uid;
        } catch {
          uid = (await adminAuth.createUser({ email, password: "Sandbox123!", displayName: fakeNames[i] })).uid;
        }
        await adminDb.collection("users").doc(uid).set({
          uid, name: fakeNames[i], username: `sandbox_s${i + 1}`, email,
          role: "student", path: "district", grade: "7", xp: 0, isFirstTime: false, isPaid: true,
          districtId: "sandbox-district", classroomIds: ["sandbox-class-1"], teacherUid, createdAt: new Date().toISOString()
        }, { merge: true });

        const score = 55 + Math.floor(Math.random() * 40);
        const results = [{
          id: `sandbox-${i}`, userId: uid, type: "placement", score, gaps: ["Cell Theory"],
          timestamp: new Date().toISOString(),
          answers: [
            { questionId: "7-b1", questionText: "Which organelle is the powerhouse?", selectedAnswer: "Nucleus", correct: false, concept: "Cell Organelles" },
            { questionId: "7-b2", questionText: "What is the primary function of DNA?", selectedAnswer: "Store genetic information", correct: true, concept: "Genetics" }
          ]
        }];
        await adminDb.collection("results").doc(uid).set({ results });
        await adminDb.collection("stats").doc(uid).set({ totalSeconds: 1200 + i * 300, lastUpdated: new Date().toISOString() });
        studentUids.push(uid);
      }

      await adminDb.collection("classrooms").doc("sandbox-class-1").set({
        id: "sandbox-class-1", name: "Period 3 — Grade 7", teacherUid, districtId: "sandbox-district", grade: "7", studentUids
      }, { merge: true });

      res.json({ success: true, teacherEmail, password });
    } catch (error: any) {
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Valley Science backend running on http://localhost:${PORT}`);
  });
}

startServer();
