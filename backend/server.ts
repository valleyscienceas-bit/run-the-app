import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
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

      // 2. Create or update parent Firestore profile (Admin SDK bypasses rules)
      const parentProfile = {
        uid: parentDocId,
        authUid: parentAuthUid,
        name: `Parent of ${studentName || "Student"}`,
        username: `parent_${studentUid}`,
        email: parentEmail,
        linkedStudentUid: studentUid,
        role: "parent",
        path: "individual",
        grade: studentGrade || "6",
        xp: 0,
        isFirstTime: true,
        isPaid: true,
        createdAt: new Date().toISOString()
      };

      await adminDb.collection("users").doc(parentDocId).set(parentProfile, { merge: true });
      console.log(`[PROVISION] Created/updated parent profile: ${parentDocId}`);

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
