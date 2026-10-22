import { NextResponse } from "next/server";
import { checkSameOrigin, ensureAuthSchema, publicUser, recordActivity, requireUser } from "../../../lib/auth";
import { getDatabase } from "../../../lib/db";

export async function GET() {
  const access = await requireUser();
  if (!access.user) return access.response;
  return NextResponse.json({ user: publicUser(access.user) });
}

export async function PATCH(request: Request) {
  if (!checkSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const access = await requireUser();
  if (!access.user) return access.response;

  try {
    const body = (await request.json()) as {
      avatarUrl?: unknown;
      fullName?: unknown;
      phoneNumber?: unknown;
    };

    let avatarUrl: string | null = access.user.avatarUrl ?? null;
    let fullName = access.user.fullName;
    let phoneNumber = access.user.phoneNumber;

    if (body.avatarUrl !== undefined) {
      if (body.avatarUrl === null || body.avatarUrl === "") {
        avatarUrl = null;
      } else if (typeof body.avatarUrl === "string") {
        const trimmed = body.avatarUrl.trim();
        // Allow base64 data URLs (max ~2MB) or https URLs
        if (
          (trimmed.startsWith("data:image/") && trimmed.length < 3_000_000) ||
          trimmed.startsWith("http://") ||
          trimmed.startsWith("https://")
        ) {
          avatarUrl = trimmed;
        } else {
          return NextResponse.json({ error: "Invalid image format. Provide a valid photo or data URL under 2MB." }, { status: 400 });
        }
      }
    }

    if (typeof body.fullName === "string") {
      const trimmed = body.fullName.trim();
      if (trimmed.length > 0 && trimmed.length <= 120) {
        fullName = trimmed;
      }
    }

    if (typeof body.phoneNumber === "string") {
      phoneNumber = body.phoneNumber.trim().slice(0, 30);
    }

    await ensureAuthSchema();
    const sql = getDatabase();
    const [updated] = await sql`
      UPDATE portal_users
      SET avatar_url = ${avatarUrl},
          full_name = ${fullName},
          phone_number = ${phoneNumber},
          updated_at = NOW()
      WHERE id = ${access.user.id}
      RETURNING id, email, full_name AS "fullName", phone_number AS "phoneNumber",
        role, permissions, is_active AS "isActive", avatar_url AS "avatarUrl"
    `;

    if (!updated) {
      return NextResponse.json({ error: "Unable to update profile" }, { status: 404 });
    }

    await recordActivity(access.user.id, "profile_updated", {
      hasAvatar: Boolean(avatarUrl),
    });

    return NextResponse.json({
      message: "Profile updated successfully.",
      user: {
        id: String(updated.id),
        email: String(updated.email),
        fullName: String(updated.fullName),
        phoneNumber: String(updated.phoneNumber ?? ""),
        role: updated.role,
        permissions: Array.isArray(updated.permissions) ? updated.permissions : [],
        avatarUrl: updated.avatarUrl ?? null,
      },
    });
  } catch (error) {
    console.error("Unable to update profile", error);
    return NextResponse.json({ error: "Unable to update profile right now" }, { status: 500 });
  }
}
