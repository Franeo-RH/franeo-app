// app/api/demo/statut/route.ts
// GET : indique si la session courante est celle de la démo (sert aux formulaires).

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { estSessionDemo } from "@/lib/demo";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  return NextResponse.json({ demo: estSessionDemo(session) });
}
