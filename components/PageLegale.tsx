import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

/** Mise en page des pages publiques « Mentions légales » et « Confidentialité » */
export default function PageLegale({ titre, maj, children }: { titre: string; maj: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href="/login" aria-label="Retour à la connexion">
            <Image src="/FRANEO-Logo-Orange.png" alt="Franeo RH" width={52} height={64} style={{ objectFit: "contain" }} />
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/mentions-legales" className="text-gray-600 hover:text-orange-600">Mentions légales</Link>
            <Link href="/confidentialite" className="text-gray-600 hover:text-orange-600">Confidentialité</Link>
          </nav>
        </div>
        <article className="bg-white rounded-xl shadow p-6 md:p-10 fr-legal">
          <h1 className="text-2xl md:text-3xl font-bold mb-1">{titre}</h1>
          <p className="text-sm text-gray-500 mb-8">Dernière mise à jour : {maj}</p>
          {children}
        </article>
      </div>
    </main>
  );
}

export function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold mb-3 text-gray-900">{titre}</h2>
      <div className="text-[15px] leading-relaxed text-gray-700 space-y-3">{children}</div>
    </section>
  );
}
