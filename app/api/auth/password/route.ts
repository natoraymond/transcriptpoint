import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { checkSameOrigin, hashPassword, recordActivity, requireUser, verifyPassword, SESSION_COOKIE } from "../../../lib/auth";
import { getDatabase } from "../../../lib/db";
import { Resend } from "resend";

export async function PATCH(request: Request) {
  if (!checkSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const access = await requireUser();
  if (!access.user) return access.response;

  try {
    const body = await request.json() as { currentPassword?: unknown; newPassword?: unknown };
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    if (newPassword.length < 9 || newPassword.length > 200) {
      return NextResponse.json({ error: "Your new password must contain at least 9 characters" }, { status: 400 });
    }
    if (newPassword === currentPassword) {
      return NextResponse.json({ error: "Choose a password different from your current password" }, { status: 400 });
    }

    const sql = getDatabase();
    const [account] = await sql`SELECT password_hash AS "passwordHash" FROM portal_users WHERE id = ${access.user.id} AND is_active = TRUE LIMIT 1`;
    if (!account || !await verifyPassword(currentPassword, String(account.passwordHash))) {
      return NextResponse.json({ error: "Your current password is incorrect" }, { status: 401 });
    }

    const currentToken = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!currentToken || !/^[a-f0-9]{64}$/i.test(currentToken)) {
      return NextResponse.json({ error: "Your session has expired. Sign in again." }, { status: 401 });
    }
    const currentTokenHash = createHash("sha256").update(currentToken).digest("hex");
    const nextHash = await hashPassword(newPassword);
    await sql`UPDATE portal_users SET password_hash = ${nextHash}, updated_at = NOW() WHERE id = ${access.user.id}`;
    await sql`DELETE FROM portal_sessions WHERE user_id = ${access.user.id} AND token_hash <> ${currentTokenHash}`;
    await recordActivity(access.user.id, "password_changed");

    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM;
    if (resendApiKey && emailFrom) {
      try {
        const resend = new Resend(resendApiKey);
        const { error: notificationError } = await resend.emails.send({
          from: emailFrom,
          to: access.user.email,
          subject: "Your TranscriptPoint password was changed",
          text: `Hello ${access.user.fullName}, your TranscriptPoint password was changed on ${new Date().toUTCString()}. If you did not make this change, contact support immediately.`,
        });
        if (notificationError) console.error("Unable to send password-change notification", notificationError);
      } catch (notificationError) {
        console.error("Unable to send password-change notification", notificationError);
      }
    }

    return NextResponse.json({ ok: true, message: "Password changed. Other active sessions were signed out." });
  } catch (error) {
    console.error("Unable to change portal password", error);
    return NextResponse.json({ error: "Unable to change password right now" }, { status: 500 });
  }
}
