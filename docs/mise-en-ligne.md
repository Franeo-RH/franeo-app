# Mise en ligne de Franeo RH

## Avant chaque mise en ligne : test en local

```
cd ~/Desktop/franeo-app && npm install && npx prisma db push && npm run build && npm run dev
```

Puis ouvrir http://localhost:3000. Les données utilisées sont celles de la base indiquée dans `.env`.

### Liste de contrôle (10 minutes)

1. Connexion admin, connexion client, démo dirigeant, démo salarié.
2. Fichiers Excel : récap factures, pointages, projets, export paie, export complet admin, modèle « nouveau client » et modèles d'import admin. Ils doivent s'ouvrir sans message de réparation (titres orange FRANEO, sans logo).
3. Modèle d'import salariés : le remplir à partir de la ligne 2 et l'importer.
4. Fiche d'un salarié › « Données personnelles (RGPD) » › Télécharger toutes ses données.
5. Espace salarié › « Mes données personnelles » › Télécharger mes données.
6. Admin › Salariés › « RGPD & sécurité » : les connexions du test apparaissent dans le journal.
7. Buddy : « mes projets », « projets en alerte », « comment déclarer un arrêt maladie ? ».
8. Pages /confidentialite et /mentions-legales (liens en bas de la page de connexion).
9. Mon entreprise › Accès dirigeants d'établissement : créer un accès, ouvrir le lien dans une fenêtre privée, choisir le mot de passe. Ce compte ne doit voir que les salariés et les projets de son établissement.
11. Gestion RH › Soldes de congés : tous les salariés à 0 au départ ; modifier un solde ou importer le modèle, enregistrer, vérifier la fiche du salarié, son espace et l'espace de son manager. BTP : mettre « BTP » (ou l'IDCC) dans la convention collective.
12. Admin › Entreprises › Ajouter : plus de mot de passe à saisir. Le client reçoit l'e-mail « Activez votre compte » (en local sans `RESEND_API_KEY`, le lien s'affiche à la place). Fiche entreprise › Gestion des accès › Modifier › Mot de passe : « Envoyer un lien d'activation ».
13. Admin › Demandes des clients › Devis (et Apps, options & formations) : écrire au client, déposer un PDF, puis « Valider et ajouter à la facture » avec un montant et un mois. Le montant apparaît dans la facture de ce mois et sur les tableaux de bord ; côté client, l'échange et les documents sont dans Mon entreprise › Autres apps & demandes.
14. Gestion RH › Courriers & modèles : choisir « Rupture de la période d'essai », un salarié, compléter, « Imprimer / PDF » ; créer un modèle personnel.
15. Espace salarié › Absences › « Déclarer un accident » ; côté client, Gestion RH › Accidents du travail : le dossier apparaît avec la date limite de la DAT.
16. Paie › Déclarer une sortie : la sortie apparaît dans Admin › Salariés › Demandes clients (ou directement sur la fiche sans formule paie).
17. Admin › Communication › Questions Buddy : ajouter une réponse « 🔎 Chercher dans l'app › Soldes de congés » avec la question « solde de congés », puis demander à Buddy côté client « quel est le solde de congés de Marie ».
10. Tableau de bord : la carte « Mise à jour V52 » s'affiche ; « J'ai lu » la masque ; l'historique est dans Communication › Mises à jour.

## Variables d'environnement (Vercel › Settings › Environment Variables)

| Variable | Obligatoire | Rôle |
|---|---|---|
| `DATABASE_URL` | oui | Base Neon |
| `SESSION_SECRET` | conseillé | Signature des sessions (64 caractères au hasard ; le changer déconnecte tout le monde) |
| `CRON_SECRET` | oui pour la nuit | Protège la tâche de nuit (remise à zéro de la démo + purge RGPD) |
| `RESEND_API_KEY` | oui | Envoi des e-mails (`MAIL_FROM` et `MAIL_ADMIN` : expéditeur et adresse admin) |
| `NEXT_PUBLIC_URL` | conseillé | Adresse du site dans les e-mails |
| `OVH_S3_*` | oui | Stockage des documents chez OVH |

Générer un secret sur le Mac : `openssl rand -hex 32`

## Informations légales à compléter

Dans `lib/legal.ts` : responsable, SIRET, adresse, e-mail de contact et région de la base Neon.
Tant que ce n'est pas fait, un bandeau orange le rappelle dans Admin › Salariés › RGPD & sécurité.
