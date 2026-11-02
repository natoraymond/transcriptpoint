import { NextResponse } from "next/server";
import { checkSameOrigin, getCurrentUser, touchCurrentSession } from "../../../lib/auth";

export async function POST(request: Request) {
  if (!checkSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const touched = await touchCurrentSession();
  return NextResponse.json({ ok: touched, timestamp: Date.now() });
}

