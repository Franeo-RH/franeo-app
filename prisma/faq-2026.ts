// Ajoute les questions fréquentes communes à tous les clients (sans doublon : une question déjà présente n'est pas recréée).
// Lancer avec :  npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/faq-2026.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FAQ: { module: string; question: string; reponse: string }[] = [
  // Général
  { module: "Général", question: "Qu'est-ce que l'application Franeo ?", reponse: "Franeo est votre espace en ligne avec FRANEO RH : vous y gérez vos salariés, vos variables de paie, vos absences, vos échéances et vos tickets RH, et vous suivez vos coûts. Elle fonctionne sur ordinateur et sur téléphone." },
  { module: "Général", question: "Puis-je installer l'application sur mon téléphone ?", reponse: "Oui. Sur la page de connexion, touchez « Installer l'application ». Sur iPhone : bouton Partager de Safari puis « Sur l'écran d'accueil ». Sur Android : menu de Chrome puis « Installer l'application ». Sans connexion, vous pouvez consulter les dernières pages affichées, en lecture seule." },
  { module: "Général", question: "Qui est mon interlocuteur ?", reponse: "Votre gestionnaire paie & RH FRANEO RH. Pour une question RH, ouvrez un ticket RH ; pour un problème technique sur l'application, ouvrez un ticket Helpdesk." },
  { module: "Général", question: "À quoi servent les communications sur mon tableau de bord ?", reponse: "Ce sont les informations importantes publiées par FRANEO RH (fermeture, changement réglementaire, date de clôture…). Elles restent affichées jusqu'à ce que vous cliquiez sur « ✅ J'ai lu »." },
  // Salariés
  { module: "Salariés", question: "Comment ajouter un salarié ?", reponse: "Menu Salariés › Ajouter un salarié. Remplissez la fiche (identité, contrat, salaire). Si votre formule inclut la paie, l'ajout est envoyé à votre gestionnaire, qui le valide avant création." },
  { module: "Salariés", question: "Quelles modifications sont validées par mon gestionnaire ?", reponse: "Avec une formule paie, seuls le changement de poste et le changement de salaire sont envoyés en validation. Toutes les autres informations (adresse, email, téléphone, contrat, dates…) sont enregistrées tout de suite. Suivez vos demandes dans Salariés › Mes demandes." },
  { module: "Salariés", question: "Comment suivre les échéances (période d'essai, fin de CDD, visite médicale) ?", reponse: "Menu Salariés › Échéances : toutes les dates à venir y sont regroupées, avec les retards en rouge. Vous pouvez aussi les voir sur chaque fiche salarié." },
  { module: "Salariés", question: "Puis-je exporter mes salariés sur Excel ?", reponse: "Oui, depuis la liste des salariés, bouton d'export Excel. Les variables, absences et échéances s'exportent aussi depuis leurs pages." },
  // Paie
  { module: "Paie", question: "Jusqu'à quand puis-je saisir mes variables du mois ?", reponse: "Saisissez-les le plus tôt possible avant la date de clôture communiquée par votre gestionnaire. Une variable « En attente » peut encore être supprimée ; une fois validée, demandez la correction par ticket." },
  { module: "Paie", question: "Que comprend le prix de ma formule paie ?", reponse: "Le prix inclut le logiciel de paie, les bulletins dans la limite de votre formule, les régularisations et rappels de salaire, les saisies sur salaire, les simulations de coût d'embauche et l'application Franeo. Le détail est dans Mon entreprise › Abonnement Paie." },
  { module: "Paie", question: "Que se passe-t-il si une action entraîne un coût supplémentaire ?", reponse: "L'application vous affiche le montant avant de valider et vous demande votre accord. Rien n'est facturé sans votre confirmation. Elle peut aussi vous proposer une formule plus adaptée." },
  { module: "Paie", question: "Comment commander une prestation (bulletin rectificatif, rupture conventionnelle…) ?", reponse: "Menu Paie › Prestations : choisissez la prestation, le salarié concerné et validez. Le prix s'affiche avant la commande ; les prestations incluses dans votre formule sont à 0 €." },
  // Absences
  { module: "Absences", question: "Comment déclarer une absence ?", reponse: "Menu Paie › Absences : choisissez le salarié, le type d'absence et les dates. Pour un arrêt maladie, indiquez uniquement les dates : aucun document médical n'est enregistré dans l'application." },
  { module: "Absences", question: "Comment valider une demande d'absence d'un salarié ?", reponse: "Les demandes faites par vos salariés depuis leur espace apparaissent dans Paie › Absences avec la mention « 📱 déclarée par le salarié ». Cliquez sur Valider ou Refuser ; en cas de refus, indiquez un motif, que le salarié verra. Vous recevez aussi un mail à chaque nouvelle demande." },
  // Espace salarié
  { module: "Espace salarié", question: "Qu'est-ce que l'espace salarié ?", reponse: "Une option qui permet à vos salariés, depuis leur téléphone, de demander leurs congés, RTT et autres absences, de suivre la réponse et de voir leurs échéances. Vous restez seul à valider. Les arrêts maladie restent saisis par vous ou votre gestionnaire." },
  { module: "Espace salarié", question: "Combien coûte l'espace salarié ?", reponse: "1 € par mois par salarié disposant d'un accès actif. Il est inclus sans supplément dans les formules Premium et Entreprise." },
  { module: "Espace salarié", question: "Comment donner l'accès à un salarié ?", reponse: "Ouvrez la fiche du salarié, bloc « 📱 Espace salarié », puis cliquez sur Inviter. Le salarié reçoit un mail pour créer son mot de passe (lien valable 7 jours). Son email doit être renseigné dans sa fiche." },
  { module: "Espace salarié", question: "Comment retirer l'accès à un salarié ?", reponse: "Sur sa fiche, bloc « 📱 Espace salarié », cliquez sur « Couper l'accès ». Vous pouvez le rétablir à tout moment. L'accès est aussi coupé automatiquement après la date de sortie du salarié." },
  { module: "Espace salarié", question: "Mes salariés voient-ils leurs bulletins ou leur salaire ?", reponse: "Non. Ils voient uniquement leurs demandes d'absence, leur statut et leurs échéances. Ils n'ont pas accès aux autres salariés ni aux données de l'entreprise." },
  { module: "Espace salarié", question: "Mes salariés peuvent-ils saisir leurs heures ?", reponse: "Oui. Dans leur espace, rubrique « ⏱️ Mon relevé d'heures », ils remplissent un calendrier mensuel (du lundi au dimanche) avec leurs heures travaillées et leurs heures supplémentaires. Ils enregistrent au fil du mois, puis envoient le relevé, qui n'est alors plus modifiable. Leurs absences et arrêts s'y affichent automatiquement. Vous validez ou refusez dans Paie › Relevés d'heures ; un refus rouvre le relevé au salarié." },
  { module: "Paie", question: "Que deviennent les heures supplémentaires validées ?", reponse: "Quand vous validez un relevé dans Paie › Relevés d'heures, le total des heures supplémentaires du mois est automatiquement ajouté aux variables de paie, et transmises à votre gestionnaire pour le bulletin." },
  // Tickets RH
  { module: "Tickets RH", question: "Combien de tickets RH ai-je par mois ?", reponse: "Essentielle : 1 · Sérénité : 3 · Premium : 6 · Entreprise : 10. Les tickets non utilisés ne sont pas reportés. Au-delà, chaque ticket est facturé selon votre formule, avec votre accord préalable." },
  { module: "Tickets RH", question: "Quelle différence entre un ticket RH et un ticket Helpdesk ?", reponse: "Le ticket RH sert à poser une question RH ou paie à votre gestionnaire (contrat, procédure, droit du travail). Le ticket Helpdesk sert à signaler un problème ou proposer une amélioration de l'application. Les tickets Helpdesk ne sont pas décomptés." },
  // Facturation
  { module: "Facturation", question: "Comment suis-je facturé ?", reponse: "Une facture mensuelle vous est envoyée via Abby, à régler par virement. Elle reprend votre abonnement, les bulletins ou salariés supplémentaires, les options et les prestations du mois." },
  { module: "Facturation", question: "Où retrouver mes factures ?", reponse: "Menu Mon entreprise › Factures. Vous y voyez aussi l'estimation du mois en cours." },
  // Helpdesk
  { module: "Helpdesk", question: "L'application ne s'affiche pas correctement, que faire ?", reponse: "Actualisez la page, puis déconnectez-vous et reconnectez-vous. Si le problème continue, ouvrez un ticket Helpdesk en décrivant la page concernée, avec une capture d'écran si possible." },
  { module: "Helpdesk", question: "J'ai oublié mon mot de passe", reponse: "Sur la page de connexion, cliquez sur « Mot de passe oublié ? » et saisissez votre email : vous recevrez un lien pour en créer un nouveau." },
  // Entreprise
  { module: "Entreprise", question: "Comment changer de formule ?", reponse: "Menu Mon entreprise › Abonnement Paie (ou Abonnement RH) : demandez le changement de formule. Votre gestionnaire le valide et il s'applique à la facturation suivante." },
];

async function main() {
  let ajoutees = 0;
  for (const [i, f] of FAQ.entries()) {
    const existe = await prisma.fAQ.findFirst({ where: { question: f.question, entrepriseId: null } });
    if (existe) continue;
    await prisma.fAQ.create({ data: { ...f, ordre: i, entrepriseId: null } });
    ajoutees++;
  }
  console.log(`✅ ${ajoutees} question(s) ajoutée(s) — ${FAQ.length - ajoutees} déjà présente(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
