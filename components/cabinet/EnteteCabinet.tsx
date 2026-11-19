"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { oublierDroits } from "@/components/useDroits";

/** Barre du haut de l'espace cabinet (portefeuille, collaborateurs) */
export default function EnteteCabinet({ cabinet, prenom, gerant }: { cabinet: string; prenom: string; gerant: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const liens = [
    { href: "/cabinet", label: "🗂️ Portefeuille" },
    ...(gerant ? [{ href: "/cabinet/collaborateurs", label: "👥 Collaborateurs" }] : []),
  ];
  async function deconnecter() {
    await fetch("/api/logout", { method: "POST" });
    oublierDroits();
    router.push("/login");
  }
  return (
    <header className="fr-cab-entete">
      <Link href="/cabinet" className="fr-cab-marque" aria-label="Portefeuille">
        <Image src="/FRANEO-Logo-Orange.png" alt="Franeo RH" width={33} height={40} style={{ objectFit: "contain" }} priority />
        <span>
          <span className="fr-cab-petit">Accès cabinet</span>
          <span className="fr-cab-nom">{cabinet}</span>
        </span>
      </Link>
      <nav className="fr-cab-liens">
        {liens.map((l) => (
          <Link key={l.href} href={l.href} className={`fr-cab-lien${pathname === l.href ? " fr-actif" : ""}`}>{l.label}</Link>
        ))}
      </nav>
      <div className="fr-cab-profil">
        <span className="fr-cab-prenom">{prenom}</span>
        <button type="button" onClick={deconnecter} className="fr-cab-deco">Déconnexion</button>
      </div>
    </header>
  );
}
