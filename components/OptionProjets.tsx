"use client";

import { PRIX_OPTION_PROJETS } from "@/lib/projets-constantes";
import OptionPayante, { type EtatOption } from "@/components/OptionPayante";

/** Abonnement : option Projets (29 € HT/mois, incluse avec RH Premium et Paie Premium) */
export default function OptionProjets({ etat, peutDemander, inclus = false }: { etat: EtatOption; peutDemander: boolean; inclus?: boolean }) {
  return (
    <OptionPayante
      option="projets" icone="📐" titre="Projets (coût et gain par projet)"
      description="Planifiez vos équipes par projet ou chantier, suivez les heures pointées et le coût réel au jour le jour, comparez au prévisionnel et voyez la marge de chaque projet."
      prix={PRIX_OPTION_PROJETS} conditions="inclus avec RH Premium et Paie Premium" inclus={inclus} etat={etat} peutDemander={peutDemander}
    />
  );
}
