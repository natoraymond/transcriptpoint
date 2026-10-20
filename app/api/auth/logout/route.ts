import { NextResponse } from "next/server";
import { checkSameOrigin, destroyCurrentSession } from "../../../lib/auth";

export async function POST(request: Request) {
  if (!checkSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  try {
    await destroyCurrentSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to sign out portal user", error);
    return NextResponse.json({ error: "Unable to sign out right now" }, { status: 500 });
  }
}
