// lib/hub-espace-client.ts — fiche client du portail (Franeo RH) : accès, établissements, services, registre du personnel
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appelInterne } from "@/lib/hub-interne";

/** GET vue=client&id=<entreprise> : listes des boutons et sections affichées sur la fiche */
export async function lireClient(id: string) {
  const e = await prisma.entreprise.findUnique({ where: { id }, select: { utilisateurs: { where: { role: "CLIENT" }, select: { id: true, prenom: true, email: true, actif: true, etablissementId: true }, orderBy: { createdAt: "asc" } }, etablissements: { orderBy: { createdAt: "asc" } }, services: { orderBy: { ordre: "asc" } } } }).catch(() => null);
  if (!e) return null;
  return {
    options: {
      utilisateur: e.utilisateurs.map((u) => `${u.prenom} · ${u.email}::${u.id}`),
      etablissement: e.etablissements.map((x) => `${x.nom}::${x.id}`),
      service: e.services.map((x) => `${x.nom}::${x.id}`),
    },
    sections: [
      { titre: "🏭 Établissements", lignes: e.etablissements.length ? e.etablissements.map((x) => ({ titre: x.nom, detail: [x.rue, [x.codePostal, x.ville].filter(Boolean).join(" "), x.siret ? `SIRET ${x.siret}` : ""].filter(Boolean).join(" · ") })) : [{ titre: "Aucun établissement", detail: "Le siège seul" }] },
      { titre: "🗂️ Services", lignes: e.services.length ? e.services.map((x) => ({ titre: x.nom })) : [{ titre: "Aucun service" }] },
    ],
  };
}

/** POST vue=client : actions propres à Franeo RH sur la fiche du client (id = entreprise) */
export async function agirClient(request: NextRequest, b: Record<string, unknown>): Promise<NextResponse> {
  const email = typeof b.email === "string" ? b.email : null;
  const v = (b.valeurs ?? {}) as Record<string, unknown>;
  const ent = /^[\w-]{1,60}$/.test(String(b.id ?? "")) ? String(b.id) : "";
  const sous = (k: string) => (/^[\w-]{1,60}$/.test(String(v[k] ?? "")) ? String(v[k]) : "");
  const appel = async (chemin: string, methode: string, corps: unknown, ok: string) => {
    const r = await appelInterne(request, email, chemin, { methode, corps });
    const d = await r.json().catch(() => ({}));
    return NextResponse.json(r.ok ? { succes: true, message: d?.mailEnvoye === false && d?.lien ? `${ok} (e-mail non parti : lien à transmettre)` : ok, ...(d?.lien ? { lien: d.lien } : {}) } : { erreur: d?.erreur ?? `Refusé (${r.status})` }, { status: r.ok ? 200 : r.status });
  };
  switch (b.action) {
    case "acces.creer": return appel("/api/utilisateurs", "POST", { prenom: v.prenom, email: v.email_acces, entrepriseId: ent }, "✓ Accès créé, invitation envoyée");
    case "acces.modifier": return appel(`/api/utilisateurs/${sous("utilisateur")}`, "PUT", { ...(v.prenom ? { prenom: v.prenom } : {}), ...(v.email_acces ? { email: v.email_acces } : {}) }, "✓ Accès modifié");
    case "acces.supprimer": return appel(`/api/utilisateurs/${sous("utilisateur")}`, "DELETE", undefined, "Accès supprimé");
    case "etablissement.creer": return appel("/api/etablissements", "POST", { entrepriseId: ent, nom: v.nom, rue: v.rue, codePostal: v.codePostal, ville: v.ville, siret: v.siret }, "✓ Établissement ajouté");
    case "etablissement.supprimer": return appel(`/api/etablissements/${sous("etablissement")}`, "DELETE", undefined, "Établissement supprimé");
    case "service.creer": return appel("/api/services", "POST", { entrepriseId: ent, nom: v.nom }, "✓ Service ajouté");
    case "service.supprimer": return appel(`/api/services/${sous("service")}`, "DELETE", undefined, "Service supprimé");
  }
  return NextResponse.json({ erreur: "Action pas encore reliée" }, { status: 404 });
}
