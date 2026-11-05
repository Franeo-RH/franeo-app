"use client";

import CadreClient from "@/components/CadreClient";
import ListeQuestionsRH from "@/components/ListeQuestionsRH";

export default function NouvelleDemandePonctuelle() {
  return (
    <CadreClient>
      <ListeQuestionsRH mode="nouvelle" />
    </CadreClient>
  );
}
