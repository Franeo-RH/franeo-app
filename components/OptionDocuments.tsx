"use client";

import { PRIX_OPTION_DOCUMENTS } from "@/lib/projets-constantes";
import OptionPayante, { type EtatOption } from "@/components/OptionPayante";

/** Option Documents & contrats (5 € HT/mois avec Basic, incluse dès Essentiel) */
export default function OptionDocuments({ etat, peutDemander, inclus = false }: { etat: EtatOption; peutDemander: boolean; inclus?: boolean }) {
  return (
    <OptionPayante
      option="documents" icone="📄" titre="Documents & contrats"
      description="Générez vos contrats de travail depuis vos modèles Word, et vos courriers types (rupture ou renouvellement de période d'essai, relances, attestation employeur…) en PDF à votre logo, prêts à imprimer ou à envoyer par e-mail."
      prix={PRIX_OPTION_DOCUMENTS} conditions="avec la formule Basic, inclus dès Essentiel" inclus={inclus} etat={etat} peutDemander={peutDemander}
    />
  );
}
