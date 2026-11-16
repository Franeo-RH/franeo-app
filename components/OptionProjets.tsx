"use client";

import { PRIX_OPTION_PROJETS } from "@/lib/projets-constantes";
import OptionPayante, { type EtatOption } from "@/components/OptionPayante";

/** Abonnement : option Projets (29 € HT/mois avec Basic ou Essentiel, incluse dès Sérénité) */
export default function OptionProjets({ etat, peutDemander, inclus = false }: { etat: EtatOption; peutDemander: boolean; inclus?: boolean }) {
  return (
    <OptionPayante
      option="projets" icone="📐" titre="Projets, planning & rentabilité"
      description="Planifiez vos équipes par projet ou chantier, suivez les heures pointées et le coût réel au jour le jour, comparez au prévisionnel et voyez la marge de chaque projet."
      prix={PRIX_OPTION_PROJETS} conditions="inclus dès Sérénité (formule RH ou paie)" inclus={inclus} etat={etat} peutDemander={peutDemander}
    />
  );
}
