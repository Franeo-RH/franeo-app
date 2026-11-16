"use client";

import { PRIX_OPTION_MEDICAL } from "@/lib/projets-constantes";
import OptionPayante, { type EtatOption } from "@/components/OptionPayante";

/** Option Suivi médical complet (5 € HT/mois, incluse dès Sérénité RH ou paie) */
export default function OptionMedical({ etat, peutDemander, inclus = false }: { etat: EtatOption; peutDemander: boolean; inclus?: boolean }) {
  return (
    <OptionPayante
      option="medical" icone="🩺" titre="Suivi médical complet"
      description="Le type de suivi de chaque salarié (VIP, suivi renforcé, adapté), la date de sa prochaine visite calculée automatiquement, les visites de reprise après un arrêt et la visite de mi-carrière : tout est rappelé dans vos échéances. Le coût du service de santé au travail reste à votre charge."
      prix={PRIX_OPTION_MEDICAL} conditions="inclus dès Sérénité (formule RH ou paie)" inclus={inclus} etat={etat} peutDemander={peutDemander}
    />
  );
}
