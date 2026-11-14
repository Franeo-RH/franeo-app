import type { Metadata } from "next";
import Link from "next/link";
import PageLegale, { Section } from "@/components/PageLegale";
import { EDITEUR, SOUS_TRAITANTS } from "@/lib/legal";

export const metadata: Metadata = { title: "Mentions légales · Franeo RH" };

export default function MentionsLegales() {
  const vercel = SOUS_TRAITANTS[0];
  return (
    <PageLegale titre="Mentions légales" maj="novembre 2026">
      <Section titre="Éditeur">
        <p>
          <strong>{EDITEUR.nomCommercial}</strong> — {EDITEUR.statut}
          <br />Responsable : {EDITEUR.responsable}
          <br />SIRET : {EDITEUR.siret}
          <br />Adresse : {EDITEUR.adresse}
          <br />Contact : {EDITEUR.email}
        </p>
        <p>Directeur de la publication : {EDITEUR.responsable}.</p>
      </Section>
      <Section titre="Hébergement">
        <p>
          {vercel.nom} — {vercel.adresse}.
          <br />Les documents déposés dans l&apos;application sont stockés en France chez OVHcloud (2 rue Kellermann, 59100 Roubaix).
        </p>
      </Section>
      <Section titre="Propriété intellectuelle">
        <p>L&apos;application, ses textes, logos et visuels appartiennent à {EDITEUR.nomCommercial}. Toute reproduction sans autorisation est interdite.</p>
      </Section>
      <Section titre="Données personnelles">
        <p>
          Le traitement des données personnelles est décrit dans la <Link href="/confidentialite" className="underline text-orange-600">politique de confidentialité</Link>.
        </p>
      </Section>
    </PageLegale>
  );
}
