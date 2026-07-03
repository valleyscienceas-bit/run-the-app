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

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, port: PORT, pid: process.pid });
  });

  // CORS for local frontend dev (allow any origin so 127.0.0.1 / LAN IPs work)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) res.header("Access-Control-Allow-Origin", origin);
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
  // INQUIRY & FEEDBACK ROUTES (save-first, email best-effort)
  // ==========================================
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "valley.science.as@gmail.com";

  async function sendEmailBestEffort(opts: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: { filename: string; content: Buffer; contentType?: string }[];
  }): Promise<boolean> {
    if (!process.env.SMTP_USER) {
      console.log("--- SIMULATED EMAIL ---");
      console.log(`To: ${opts.to}`);
      console.log(`Subject: ${opts.subject}`);
      console.log(`Body: ${opts.text || "HTML Content"}`);
      if (opts.attachments?.length) {
        console.log(`Attachments: ${opts.attachments.map((a) => a.filename).join(", ")}`);
      }
      console.log("-----------------------");
      return true;
    }
    try {
      const transporter = await getMailTransporter();
      await transporter.sendMail({
        from: `"Valley Science" <${process.env.SMTP_USER}>`,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
        attachments: opts.attachments,
      });
      return true;
    } catch (mailErr: any) {
      console.error("[EMAIL] Send failed:", mailErr.message);
      return false;
    }
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

      let emailSent = false;
      if (process.env.SMTP_USER) {
        try {
          const transporter = await getMailTransporter();
          await transporter.sendMail({
            from: `"Valley Science" <${process.env.SMTP_USER}>`,
            to: ADMIN_EMAIL,
            subject: `Demo Request: ${name}`,
            html
          });
          emailSent = true;
        } catch (mailErr: any) {
          console.error("[DEMO] Admin notification email failed:", mailErr.message);
          console.log(`[DEMO] Approve URL (email failed): ${approveUrl}`);
        }
      } else {
        console.log(`[DEMO] Approve URL: ${approveUrl}`);
      }

      // Acknowledge receipt to requester (non-blocking for success)
      if (process.env.SMTP_USER) {
        try {
          const transporter = await getMailTransporter();
          await transporter.sendMail({
            from: `"Valley Science" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "We received your Valley Science demo request",
            html: `
              <div style="font-family:sans-serif;padding:20px;">
                <h2 style="color:#0f172a;">Demo Request Received</h2>
                <p>Hi ${name},</p>
                <p>Thanks for your interest in Valley Science! We've received your demo request and will email you login details once it's approved.</p>
                <p style="color:#64748b;font-size:14px;">— The Valley Science Team</p>
              </div>`
          });
        } catch (mailErr: any) {
          console.error("[DEMO] Requester confirmation email failed:", mailErr.message);
        }
      }

      res.json({ success: true, emailSent });
    } catch (error: any) {
      console.error("Demo request error:", error);
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
    try {
      const parentSnap = await adminDb.collection("users").doc(parentUid).get();
      if (!parentSnap.exists || parentSnap.data()?.role !== "parent") return res.status(403).json({ error: "Not a parent account" });

      const userCred = await adminAuth.createUser({ email, password, displayName: name });
      const studentUid = userCred.uid;
      const parentData = parentSnap.data()!;

      await adminDb.collection("users").doc(studentUid).set({
        uid: studentUid, name, username: username || `student_${studentUid.slice(-6)}`, email,
        parentUid, parentEmail: parentData.email, role: "student", path: "individual",
        grade: grade || "6", xp: 0, isFirstTime: true, isPaid: false, createdAt: new Date().toISOString()
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
        const [userSnap, resultsSnap] = await Promise.all([
          adminDb.collection("users").doc(uid).get(),
          adminDb.collection("results").doc(uid).get()
        ]);
        if (!userSnap.exists) continue;
        const u = userSnap.data()!;
        const results = resultsSnap.exists ? (resultsSnap.data()?.results || []) : [];
        const avgScore = results.length
          ? Math.round(results.reduce((s: number, r: { score?: number }) => s + (r.score || 0), 0) / results.length)
          : null;
        classmates.push({ uid, name: u.name, username: u.username, grade: u.grade, avgScore });
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
        districtId: "sandbox-district", classroomIds: ["sandbox-class-1"], demoPassword: password,
        createdAt: new Date().toISOString()
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
          districtId: "sandbox-district", classroomIds: ["sandbox-class-1"], teacherUid, demoPassword: password,
          createdAt: new Date().toISOString()
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

      // Sample assignments with varied student progress
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

      const assignCurrent = adminDb.collection("assignments").doc("sandbox-assign-current");
      await assignCurrent.set({
        id: "sandbox-assign-current", classroomId: "sandbox-class-1", teacherUid,
        title: "Cell Structure Module", dueAt: futureDue.toISOString(), grade: "7",
        minScore: 70, moduleIds: ["module-placeholder-1"], submissions: buildSubmissions(0),
        createdAt: new Date().toISOString()
      }, { merge: true });

      const assignPast = adminDb.collection("assignments").doc("sandbox-assign-past");
      await assignPast.set({
        id: "sandbox-assign-past", classroomId: "sandbox-class-1", teacherUid,
        title: "Ecosystems Unit Review", dueAt: pastDue.toISOString(), grade: "7",
        minScore: 65, moduleIds: ["module-placeholder-2"], submissions: buildSubmissions(1),
        createdAt: new Date(Date.now() - 14 * 86400000).toISOString()
      }, { merge: true });

      res.json({
        success: true, teacherEmail, password,
        studentEmail: "sandbox.student1@valley-science.demo", studentPassword: password
      });
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

  // #region agent log
  fetch('http://127.0.0.1:7887/ingest/9957fc9c-a7ba-454b-b31a-1e2b29b7ba3c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c3efbc'},body:JSON.stringify({sessionId:'c3efbc',hypothesisId:'H1',location:'server.ts:listen-attempt',message:'attempting port bind',data:{port:PORT,pid:process.pid},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  const server = app.listen(PORT, "0.0.0.0", () => {
    // #region agent log
    fetch('http://127.0.0.1:7887/ingest/9957fc9c-a7ba-454b-b31a-1e2b29b7ba3c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c3efbc'},body:JSON.stringify({sessionId:'c3efbc',hypothesisId:'H1',location:'server.ts:listen-success',message:'port bind succeeded',data:{port:PORT,pid:process.pid},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    console.log(`Valley Science backend running on http://localhost:${PORT}`);
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    // #region agent log
    fetch('http://127.0.0.1:7887/ingest/9957fc9c-a7ba-454b-b31a-1e2b29b7ba3c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c3efbc'},body:JSON.stringify({sessionId:'c3efbc',hypothesisId:'H1',location:'server.ts:listen-error',message:'port bind failed',data:{port:PORT,code:err.code,errno:err.errno,pid:process.pid},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
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
