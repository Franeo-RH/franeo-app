// proxy.ts
// Démo en consultation seule : toute modification et tout téléchargement sont refusés côté serveur
// pour une session ouverte avec « Tester la démo ». La marque démo est signée dans le cookie de session :
// effacer le cookie franeo_demo ne permet pas d'en sortir.

import { NextResponse, type NextRequest } from "next/server";
import { bloqueeEnDemo, COOKIE_DEMO, MESSAGE_DEMO } from "@/lib/demo-lecture";
import { lireJeton, NOM_COOKIE } from "@/lib/jeton-session";

function sessionDemo(request: NextRequest): boolean {
  if (request.cookies.get(COOKIE_DEMO)?.value === "1") return true;
  try {
    return !!lireJeton(request.cookies.get(NOM_COOKIE)?.value)?.demo;
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!bloqueeEnDemo(request.method, pathname, search)) return NextResponse.next();
  if (!sessionDemo(request)) return NextResponse.next();
  return NextResponse.json({ erreur: MESSAGE_DEMO, demo: true }, { status: 403 });
}

export const config = { matcher: ["/api/:path*"] };
