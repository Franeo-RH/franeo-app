// proxy.ts
// Démo en consultation seule : toute modification et tout téléchargement sont refusés côté serveur
// pour une session ouverte avec « Tester la démo » (cookie posé à l'ouverture de la démo).

import { NextResponse, type NextRequest } from "next/server";
import { bloqueeEnDemo, COOKIE_DEMO, MESSAGE_DEMO } from "@/lib/demo-lecture";

export function proxy(request: NextRequest) {
  if (request.cookies.get(COOKIE_DEMO)?.value !== "1") return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  if (!bloqueeEnDemo(request.method, pathname, search)) return NextResponse.next();
  return NextResponse.json({ erreur: MESSAGE_DEMO, demo: true }, { status: 403 });
}

export const config = { matcher: ["/api/:path*"] };
