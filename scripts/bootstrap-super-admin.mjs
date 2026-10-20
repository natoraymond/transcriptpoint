import { existsSync, readFileSync } from "node:fs";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { createInterface, emitKeypressEvents } from "node:readline";
import { neon } from "@neondatabase/serverless";

const scrypt = promisify(scryptCallback);

for (const fileName of [".env.local", ".env"]) {
  if (!existsSync(fileName)) continue;
  for (const line of readFileSync(fileName, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is missing. Add it to .env.local or .env before running bootstrap.");
if (!process.stdin.isTTY || !process.stdout.isTTY || typeof process.stdin.setRawMode !== "function") {
  throw new Error("Run this command directly in an interactive terminal so the initial password can be entered privately.");
}

const prompt = createInterface({ input: process.stdin, output: process.stdout });
const ask = (question) => new Promise((resolve) => prompt.question(question, resolve));
const readHidden = (question) => new Promise((resolve, reject) => {
  const input = process.stdin;
  process.stdout.write(question);
  emitKeypressEvents(input);
  input.setRawMode(true);
  input.resume();
  let value = "";
  const handleKey = (_character, key) => {
    if (key?.ctrl && key.name === "c") {
      input.off("keypress", handleKey);
      input.setRawMode(false);
      process.stdout.write("\n");
      reject(new Error("Bootstrap cancelled."));
      return;
    }
    if (key?.name === "return" || key?.name === "enter") {
      input.off("keypress", handleKey);
      input.setRawMode(false);
      process.stdout.write("\n");
      resolve(value);
      return;
    }
    if (key?.name === "backspace") {
      if (value.length) {
        value = value.slice(0, -1);
        process.stdout.write("\b \b");
      }
      return;
    }
    if (!key?.ctrl && typeof _character === "string" && _character.length === 1 && _character >= " ") {
      value += _character;
      process.stdout.write("*");
    }
  };
  input.on("keypress", handleKey);
});

let email = (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
let fullName = (process.env.SUPER_ADMIN_NAME ?? "").trim();
let password = process.env.SUPER_ADMIN_PASSWORD ?? "";
try {
  if (!email) email = (await ask("Super Admin email address: ")).trim().toLowerCase();
  if (!fullName) fullName = (await ask("Super Admin full name: ")).trim();
  if (!password) {
    password = await readHidden("Choose a password (at least 9 characters; input is hidden): ");
    const confirmation = await readHidden("Confirm password: ");
    if (password !== confirmation) throw new Error("Passwords do not match.");
  }
} finally {
  prompt.close();
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("Enter a valid Super Admin email address.");
if (!fullName || fullName.length > 120) throw new Error("Enter a name of 1–120 characters.");
if (password.length < 9 || password.length > 200) throw new Error("The initial password must contain 9–200 characters.");

const salt = randomBytes(16).toString("hex");
const hash = await scrypt(password, salt, 64);
const passwordHash = `scrypt:${salt}:${Buffer.from(hash).toString("hex")}`;
password = "";

const sql = neon(databaseUrl);
const [created] = await sql`
  WITH claim AS (
    UPDATE portal_settings
    SET initial_super_admin_created_at = NOW(), updated_at = NOW()
    WHERE id = TRUE
      AND initial_super_admin_created_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM portal_users WHERE role = 'super_admin')
    RETURNING id
  ), promoted AS (
    UPDATE portal_users
    SET password_hash = ${passwordHash}, full_name = ${fullName},
        role = 'super_admin', permissions = '[]'::jsonb,
        is_active = TRUE, email_verified_at = NOW(), updated_at = NOW()
    WHERE email = ${email} AND EXISTS (SELECT 1 FROM claim)
    RETURNING id, email
  ), inserted AS (
    INSERT INTO portal_users (email, password_hash, full_name, role, email_verified_at)
    SELECT ${email}, ${passwordHash}, ${fullName}, 'super_admin', NOW()
    FROM claim
    WHERE NOT EXISTS (SELECT 1 FROM promoted)
      AND NOT EXISTS (SELECT 1 FROM portal_users WHERE email = ${email})
    RETURNING id, email
  )
  SELECT id, email FROM promoted
  UNION ALL
  SELECT id, email FROM inserted
`;

if (!created) throw new Error("The initial Super Admin was already set up. Ask the existing Super Admin to grant access; this command cannot add or promote another Super Admin.");
await sql`INSERT INTO portal_activity (user_id, action, details) VALUES (${created.id}, 'initial_super_admin_bootstrapped', '{}'::jsonb)`;
console.log(`Initial Super Admin access is ready for ${created.email}. Sign in at /sign-in.`);
