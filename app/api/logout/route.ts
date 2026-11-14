import { NextRequest, NextResponse } from "next/server";
import { fermerSession } from "@/lib/jeton-session";
import { getSessionBrute } from "@/lib/session";
import { journaliser } from "@/lib/securite";

export async function POST(request: NextRequest) {
  const u = await getSessionBrute().catch(() => null);
  if (u) await journaliser({ action: "LOGOUT", utilisateur: u, request });
  const response = NextResponse.json({ succes: true });
  return fermerSession(response);
}
