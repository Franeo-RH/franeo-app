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
11. BTP : mettre « BTP » (ou l'IDCC, ex. 1597) dans la convention collective d'une entreprise ou d'un salarié ; le bloc « Congés BTP » apparaît dans la fiche du salarié et dans son espace. Gestion RH › Congés BTP : télécharger le modèle, le remplir, l'importer, enregistrer, puis vérifier le compteur dans la fiche.
10. Tableau de bord : la carte « Mise à jour V43 » s'affiche ; « J'ai lu » la masque ; l'historique est dans Communication › Mises à jour.

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
