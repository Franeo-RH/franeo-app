import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { refuserSansDroit } from "@/lib/droits-serveur";
import { stripeActif } from "@/lib/stripe";
import { urlSignatureMandat } from "@/lib/prelevement";

// POST : ouvre la page sécurisée Stripe pour signer le mandat SEPA (ou changer d'IBAN). Réservé au dirigeant.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT" || !session.entrepriseId) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  if (session.etablissementId || session.modeCabinet) return NextResponse.json({ erreur: "Le mandat est signé par le dirigeant de l'entreprise." }, { status: 403 });
  if (session.entreprise?.demo) return NextResponse.json({ erreur: "Indisponible dans la démo." }, { status: 403 });
  const refus = await refuserSansDroit("entreprise.modifier");
  if (refus) return refus;
  if (!stripeActif()) return NextResponse.json({ erreur: "Le prélèvement n'est pas encore activé. FRANEO RH vous recontacte." }, { status: 503 });
  const base = (process.env.NEXT_PUBLIC_URL || process.env.APP_URL || request.nextUrl.origin).replace(/\/$/, "");
  try {
    const url = await urlSignatureMandat(session.entrepriseId, base, session.email);
    return NextResponse.json({ url });
  } catch (e) {
    console.error("Mandat Stripe :", e);
    return NextResponse.json({ erreur: "La page de signature n'a pas pu s'ouvrir. Réessayez dans un instant." }, { status: 502 });
  }
}
