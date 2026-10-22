import { NextResponse } from "next/server";
import { checkSameOrigin, getCurrentUser, notifySuperAdminSecurityAlert, recordActivity } from "../../../lib/auth";

export async function POST(request: Request) {
  if (!checkSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });

  try {
    const user = await getCurrentUser();
    const body = (await request.json().catch(() => ({}))) as { action?: string; details?: string };
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    const actor = user
      ? `${user.fullName} (${user.email}) [Role: ${user.role}]`
      : `Unauthenticated visitor at IP: ${forwardedFor}`;

    const actionDescription = body.action || "Attempted to access or select Super Admin restricted controls";

    await notifySuperAdminSecurityAlert({
      attemptedBy: actor,
      action: actionDescription,
    });

    if (user) {
      await recordActivity(user.id, "super_admin_access_attempted", {
        action: actionDescription,
        ip: forwardedFor,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Security alert notification dispatched to Super Admin.",
    });
  } catch (error) {
    console.error("Unable to dispatch super admin security alert", error);
    return NextResponse.json({ error: "Unable to process security alert" }, { status: 500 });
  }
}
