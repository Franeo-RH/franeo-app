import type { Metadata } from "next";
import PageLegale, { Section } from "@/components/PageLegale";
import { CONSERVATION, EDITEUR, SOUS_TRAITANTS } from "@/lib/legal";

export const metadata: Metadata = { title: "Confidentialité · Franeo RH" };

export default function Confidentialite() {
  return (
    <PageLegale titre="Politique de confidentialité" maj="novembre 2026">
      <Section titre="1. Qui est responsable de vos données ?">
        <p>
          <strong>Vous êtes salarié</strong> d&apos;une entreprise cliente : votre employeur est responsable du traitement de vos données.
          {" "}{EDITEUR.nomCommercial} agit pour son compte, comme sous-traitant, et n&apos;utilise vos données que pour lui rendre le service.
        </p>
        <p>
          <strong>Vous êtes client</strong> (dirigeant, gestionnaire) : {EDITEUR.nomCommercial} est responsable des données de votre compte
          (identité, e-mail, échanges avec le support, facturation).
        </p>
      </Section>

      <Section titre="2. Quelles données ?">
        <ul className="list-disc pl-6 space-y-1">
          <li>Identité et coordonnées : nom, prénom, e-mail, téléphone, adresse, date et lieu de naissance, nationalité.</li>
          <li>Vie professionnelle : poste, contrat, dates d&apos;entrée et de sortie, service, manager, formations.</li>
          <li>Paie : salaire, primes, avantages, variables de paie, n° de sécurité sociale, IBAN.</li>
          <li>Temps de travail : absences, relevés d&apos;heures, temps passé sur les projets.</li>
          <li>Badge : date, heure et adresse au moment du pointage uniquement (aucun suivi de position en continu).</li>
          <li>Notes de frais et documents déposés (contrats, bulletins, justificatifs, arrêts de travail).</li>
          <li>Sécurité : journal des connexions (date, adresse IP, réussite ou échec).</li>
        </ul>
      </Section>

      <Section titre="3. Pourquoi ?">
        <ul className="list-disc pl-6 space-y-1">
          <li>Gérer le personnel et préparer la paie : exécution du contrat de travail et obligations légales de l&apos;employeur.</li>
          <li>Badge et relevés d&apos;heures : obligation de décompte du temps de travail et intérêt légitime de l&apos;employeur.</li>
          <li>Support, facturation et compte client : exécution du contrat avec {EDITEUR.nomCommercial}.</li>
          <li>Sécurité de l&apos;application (journal des connexions, blocage après plusieurs erreurs) : intérêt légitime.</li>
        </ul>
        <p>Vos données ne sont jamais vendues ni utilisées pour de la publicité.</p>
      </Section>

      <Section titre="4. Qui peut les voir ?">
        <p>
          Votre employeur (selon les droits qu&apos;il a configurés), votre manager pour ce qui concerne son équipe, l&apos;équipe {EDITEUR.nomCommercial}
          {" "}et, pour le faire fonctionner, les prestataires techniques suivants :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          {SOUS_TRAITANTS.map((s) => (
            <li key={s.nom}><strong>{s.nom}</strong> : {s.role} ({s.lieu}).</li>
          ))}
        </ul>
        <p>
          Quand un prestataire est situé hors de l&apos;Union européenne, le transfert est encadré par les garanties prévues par le RGPD
          (clauses contractuelles types de la Commission européenne ou adhésion au Data Privacy Framework).
        </p>
      </Section>

      <Section titre="5. Combien de temps ?">
        <ul className="list-disc pl-6 space-y-1">
          <li>Pointages du badge : {CONSERVATION.pointagesJours / 365} an, puis suppression automatique.</li>
          <li>Journal des connexions : {CONSERVATION.journalAuditJours / 365} an.</li>
          <li>Données de paie : {CONSERVATION.anonymisationApresSortieAns} ans après la sortie du salarié (obligation légale), puis anonymisation.</li>
          <li>Identité, coordonnées, documents et compte d&apos;un salarié sorti : effacés quand l&apos;employeur l&apos;anonymise, au plus tard {CONSERVATION.anonymisationApresSortieAns} ans après la sortie.</li>
          <li>Liens de connexion envoyés par e-mail : 1 heure (mot de passe oublié) ou 7 jours (invitation), à usage unique.</li>
        </ul>
      </Section>

      <Section titre="6. Comment sont-elles protégées ?">
        <p>
          Connexion chiffrée (HTTPS), mots de passe enregistrés sous forme chiffrée et jamais lisibles, blocage après plusieurs mots de passe erronés,
          cloisonnement strict entre entreprises, droits d&apos;accès réglés par l&apos;employeur, journal des actions sensibles (exports, suppressions).
        </p>
      </Section>

      <Section titre="7. Cookies">
        <p>
          L&apos;application n&apos;utilise qu&apos;un seul cookie, indispensable pour rester connecté. Aucun cookie publicitaire ni de mesure d&apos;audience :
          aucun consentement n&apos;est donc demandé. Le choix du thème clair ou sombre est gardé uniquement sur votre appareil.
        </p>
      </Section>

      <Section titre="8. Vos droits">
        <p>
          Vous pouvez accéder à vos données, les faire corriger ou effacer, vous opposer à un traitement, en limiter l&apos;usage ou les récupérer
          dans un fichier (portabilité).
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Salarié : téléchargez vos données depuis votre espace salarié (rubrique « Mes données personnelles ») et adressez vos autres demandes à votre employeur.</li>
          <li>Client, ou pour toute question : écrivez à {EDITEUR.email}. Réponse sous un mois.</li>
        </ul>
        <p>
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la CNIL (www.cnil.fr).
        </p>
      </Section>
    </PageLegale>
  );
}
