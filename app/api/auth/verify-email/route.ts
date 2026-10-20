import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { checkSameOrigin, createSession, hashPassword, recordActivity } from "../../../lib/auth";
import { getDatabase } from "../../../lib/db";

const tokenDigest = (token: string) => createHash("sha256").update(token).digest("hex");

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!/^[a-f0-9]{64}$/i.test(token)) return NextResponse.redirect(new URL("/sign-in?verification=invalid", request.url));
  return NextResponse.redirect(new URL(`/verify-email?token=${encodeURIComponent(token)}`, request.url));
}

export async function POST(request: Request) {
  if (!checkSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 2000) return NextResponse.json({ error: "Verification request is too large" }, { status: 413 });
  let token = "";
  let password = "";
  try {
    const body = await request.json() as { token?: unknown; password?: unknown };
    token = typeof body.token === "string" ? body.token : "";
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Invalid verification request" }, { status: 400 });
  }
  if (!/^[a-f0-9]{64}$/i.test(token)) return NextResponse.json({ error: "Invalid or expired verification link" }, { status: 400 });

  try {
    const sql = getDatabase();
    const tokenHash = tokenDigest(token);
    const [candidate] = await sql`
      SELECT user_id AS "userId", purpose
      FROM portal_email_verification_tokens
      WHERE token_hash = ${tokenHash} AND expires_at > NOW()
      LIMIT 1
    `;
    if (!candidate) return NextResponse.json({ error: "This verification link is invalid or expired" }, { status: 400 });
    if (candidate.purpose === "setup" && (password.length < 9 || password.length > 200)) {
      return NextResponse.json({ error: "Choose a password with at least 9 characters" }, { status: 400 });
    }

    const [verified] = await sql`
      UPDATE portal_email_verification_tokens
      SET token_hash = ${`consumed:${tokenHash}:${randomUUID()}`}
      WHERE token_hash = ${tokenHash} AND expires_at > NOW()
      RETURNING user_id AS "userId", purpose
    `;
    if (!verified) return NextResponse.json({ error: "This verification link is invalid or expired" }, { status: 400 });

    const passwordHash = verified.purpose === "setup" ? await hashPassword(password) : null;
    if (verified.purpose === "setup") {
      const [updatedAdmin] = await sql`
        UPDATE portal_users SET email_verified_at = COALESCE(email_verified_at, NOW()),
          password_hash = ${passwordHash}, updated_at = NOW()
        WHERE id = ${verified.userId} AND is_active = TRUE
        RETURNING id, role
      `;
      if (!updatedAdmin) return NextResponse.json({ error: "This account is unavailable" }, { status: 400 });
      await sql`DELETE FROM portal_email_verification_tokens WHERE token_hash LIKE ${`consumed:${tokenDigest(token)}:%`}`;
      await recordActivity(String(updatedAdmin.id), "email_verified");
      await createSession(String(updatedAdmin.id));
      return NextResponse.json({ ok: true, role: updatedAdmin.role });
    }
    const [user] = await sql`
      UPDATE portal_users SET email_verified_at = COALESCE(email_verified_at, NOW()),
        updated_at = NOW()
      WHERE id = ${verified.userId} AND is_active = TRUE
      RETURNING id, role
    `;
    if (!user) return NextResponse.json({ error: "This account is unavailable" }, { status: 400 });
    await sql`DELETE FROM portal_email_verification_tokens WHERE token_hash LIKE ${`consumed:${tokenDigest(token)}:%`}`;
    await recordActivity(String(user.id), "email_verified");
    await createSession(String(user.id));
    return NextResponse.json({ ok: true, role: user.role });
  } catch (error) {
    console.error("Unable to verify portal email", error);
    return NextResponse.json({ error: "Unable to verify email right now" }, { status: 500 });
  }
}
