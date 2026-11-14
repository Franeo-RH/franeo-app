# Mise en ligne de Franeo RH

## Avant chaque mise en ligne : test en local

```
cd ~/Desktop/franeo-app && npm install && npx prisma db push && npm run build && npm run dev
```

Puis ouvrir http://localhost:3000. Les données utilisées sont celles de la base indiquée dans `.env`.

### Liste de contrôle (10 minutes)

1. Connexion admin, connexion client, démo dirigeant, démo salarié.
2. Exports Excel : récap factures, pointages, projets, export complet admin. Ils doivent s'ouvrir sans message de réparation, avec les logos.
3. Modèle d'import salariés : le remplir à partir de la ligne 5 et l'importer.
4. Fiche d'un salarié › « Données personnelles (RGPD) » › Télécharger toutes ses données.
5. Espace salarié › « Mes données personnelles » › Télécharger mes données.
6. Admin › Salariés › « RGPD & sécurité » : les connexions du test apparaissent dans le journal.
7. Buddy : « mes projets », « projets en alerte », « comment déclarer un arrêt maladie ? ».
8. Pages /confidentialite et /mentions-legales (liens en bas de la page de connexion).

## Variables d'environnement (Vercel › Settings › Environment Variables)

| Variable | Obligatoire | Rôle |
|---|---|---|
| `DATABASE_URL` | oui | Base Neon |
| `SESSION_SECRET` | conseillé | Signature des sessions (64 caractères au hasard ; le changer déconnecte tout le monde) |
| `CRON_SECRET` | oui pour la nuit | Protège la tâche de nuit (remise à zéro de la démo + purge RGPD) |
| `RESEND_API_KEY` | oui | Envoi des e-mails (`MAIL_FROM` et `MAIL_ADMIN` : expéditeur et adresse admin) |
| `NEXT_PUBLIC_URL` | conseillé | Adresse du site dans les e-mails |
| `OVH_S3_*` | oui | Stockage des documents chez OVH |
| `ANTHROPIC_API_KEY` | non | Résumés d'actualité et réponses de Buddy par IA (60 réponses par entreprise et par jour au maximum) |
| `BUDDY_MODEL` | non | Modèle utilisé par Buddy (par défaut `claude-haiku-5-5`) |

Générer un secret sur le Mac : `openssl rand -hex 32`

## Informations légales à compléter

Dans `lib/legal.ts` : responsable, SIRET, adresse, e-mail de contact et région de la base Neon.
Tant que ce n'est pas fait, un bandeau orange le rappelle dans Admin › Salariés › RGPD & sécurité.
