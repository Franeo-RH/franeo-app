import { NextRequest, NextResponse } from "next/server";
import { fermerSession } from "@/lib/jeton-session";

export async function POST(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", request.url), 303);
  return fermerSession(res);
}
