"use client";

import { PRIX_OPTION_MEDICAL } from "@/lib/projets-constantes";
import OptionPayante, { type EtatOption } from "@/components/OptionPayante";

/** Option Suivi médical complet (5 € HT/mois, incluse dès Sérénité RH ou paie) */
export default function OptionMedical({ etat, peutDemander, inclus = false, viaCabinet = null }: { etat: EtatOption; peutDemander: boolean; inclus?: boolean; viaCabinet?: "cabinet" | "client" | null }) {
  return (
    <OptionPayante
      option="medical" icone="🩺" titre="Suivi médical complet"
      description="Le type de suivi de chaque salarié (VIP, suivi renforcé, adapté), la date de sa prochaine visite calculée automatiquement, les visites de reprise après un arrêt et la visite de mi-carrière : tout est rappelé dans vos échéances. Le coût du service de santé au travail reste à votre charge."
      prix={PRIX_OPTION_MEDICAL} conditions="inclus avec RH Sérénité, Premium et Paie Sérénité, Premium" inclus={inclus} etat={etat} peutDemander={peutDemander} viaCabinet={viaCabinet}
    />
  );
}
