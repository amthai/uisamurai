import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, hashSessionToken } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const tokenHash = hashSessionToken(token);
    await supabaseServer.from("sessions").delete().eq("token_hash", tokenHash);
  }

  cookies().set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });

  return NextResponse.json({ ok: true });
}
