// POST { salarieId, objet, texte } : envoie le courrier rédigé au salarié par e-mail (réponse possible à l'expéditeur)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { salarieVisible } from "@/lib/perimetre";
import { estSessionDemo } from "@/lib/demo";
import { accesCourriers } from "@/lib/courriers-serveur";
import { envoyerMailTexte } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  const a = await accesCourriers();
  if (!a.ok) return a.refus;
  if (!a.entrepriseId) return NextResponse.json({ erreur: "Réservé aux clients." }, { status: 403 });
  if (estSessionDemo(a.session)) return NextResponse.json({ erreur: "Non disponible dans la démo." }, { status: 403 });
  const b = await request.json().catch(() => ({}));
  const s = await prisma.salarie.findUnique({ where: { id: String(b.salarieId ?? "") }, select: { entrepriseId: true, etablissement: true, email: true, prenom: true, nom: true } });
  if (!s || s.entrepriseId !== a.entrepriseId || !salarieVisible(a.session, s)) return NextResponse.json({ erreur: "Salarié introuvable" }, { status: 404 });
  if (!s.email) return NextResponse.json({ erreur: `Aucune adresse e-mail sur la fiche de ${s.prenom} ${s.nom}.` }, { status: 400 });
  const objet = String(b.objet ?? "").trim().slice(0, 200);
  const texte = String(b.texte ?? "").trim().slice(0, 20000);
  if (!objet || !texte) return NextResponse.json({ erreur: "Objet et texte obligatoires." }, { status: 400 });
  if (/\[[^\]]{2,}\]/.test(texte)) return NextResponse.json({ erreur: "Il reste des champs à compléter (entre crochets [ ])." }, { status: 400 });
  const ok = await envoyerMailTexte({ a: s.email, sujet: objet, texte, repondreA: a.session.email });
  if (!ok) return NextResponse.json({ erreur: "L'e-mail n'a pas pu partir (vérifiez RESEND_API_KEY)." }, { status: 502 });
  return NextResponse.json({ succes: true, email: s.email });
}
