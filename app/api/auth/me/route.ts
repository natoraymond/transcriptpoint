import { NextResponse } from "next/server";
import { getCurrentUser, publicUser } from "../../../lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ user: user ? publicUser(user) : null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load current portal user", error);
    return NextResponse.json({ error: "Unable to load account" }, { status: 500 });
  }
}
