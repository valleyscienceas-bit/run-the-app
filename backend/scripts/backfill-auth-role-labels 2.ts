/**
 * One-time backfill: set Firebase Auth displayName + role custom claims from Firestore users.
 *
 * Usage:
 *   CRON_SECRET=your-secret npx tsx scripts/backfill-auth-role-labels.ts
 *   CRON_SECRET=your-secret npx tsx scripts/backfill-auth-role-labels.ts --dry-run
 */
import dotenv from "dotenv";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { backfillAuthRoleLabelsFromFirestore } from "../lib/authUserProvisioning.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const firebaseConfig = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8")
);

if (!admin.apps.length) {
  const adminOptions: admin.AppOptions = { projectId: firebaseConfig.projectId };
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    adminOptions.credential = admin.credential.cert(
      JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"))
    );
  } else {
    adminOptions.credential = admin.credential.applicationDefault();
  }
  admin.initializeApp(adminOptions);
}

const auth = admin.auth();
const db = getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId || "(default)");

const dryRun = process.argv.includes("--dry-run");

backfillAuthRoleLabelsFromFirestore(auth, db, { dryRun })
  .then((result) => {
    console.log(dryRun ? "[dry-run]" : "[backfill]", result);
    process.exit(result.errors.length > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
