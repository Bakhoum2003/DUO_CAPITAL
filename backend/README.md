# DUO CAPITAL — Backend (phase B0 : socle technique)

API Node.js + Express + MongoDB (Mongoose), JavaScript (ES Modules). Indépendante du frontend.

> **État :** socle technique (B0), modèles MongoDB (B1) et authentification/sessions (B2).
> Les comptes des associés (B3) et les modules métier (cotisations, business, retraits, historique, statistiques…) ne sont **pas** développés.

## Démarrage

```bash
cd backend
npm install
copy .env.example .env      # PowerShell : Copy-Item .env.example .env   (Linux/macOS : cp)
# éditer .env : adresses réelles de VOTRE base (jamais versionné)
npm run dev                  # http://localhost:4000/api/health
```

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur avec rechargement |
| `npm start` | serveur (production) |
| `npm test` / `npm run test:watch` | tests Vitest |
| `npm run lint` | ESLint |

## Variables d'environnement (`.env`)

| Variable | Rôle |
|---|---|
| `NODE_ENV` | `development`, `test` ou `production` |
| `PORT` | port HTTP (4000 par défaut) |
| `DATABASE_URL` | base de développement / production (jamais utilisée par les tests) |
| `TEST_DATABASE_URL` | base réservée aux tests, nom contenant « test » |
| `FRONTEND_URL` | origine(s) autorisée(s) par CORS, séparées par des virgules (obligatoire en production) |
| `LOG_LEVEL` | `fatal`…`trace`, `silent` |
| `JWT_ACCESS_SECRET` | **obligatoire** : secret de signature des jetons d'accès (≥ 32 caractères aléatoires) |
| `ACCESS_TOKEN_TTL_MINUTES` | durée du jeton d'accès, 1 à 60 (15 par défaut) |
| `REFRESH_TOKEN_TTL_DAYS` | durée du refresh token, 1 à 90 (7 par défaut) |
| `COOKIE_SAME_SITE` | `lax` (défaut), `strict` ou `none` (`none` : production/HTTPS seulement) |

Générer un secret JWT (à coller dans **votre** `.env`, jamais dans Git) :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Le serveur refuse de démarrer si `JWT_ACCESS_SECRET` est absent, trop court, répétitif ou égal au modèle de `.env.example`.

`.env.example` ne contient que des valeurs fictives. **Ne placez jamais `.env` dans Git** (déjà ignoré).

## MongoDB : replica set obligatoire (transactions)

Les futurs modules utiliseront des transactions, qui exigent un replica set, même à un seul nœud. Exemple local :

```bash
mongod --replSet rs0 --dbpath <dossier>
mongosh --eval "rs.initiate()"
```

En production, le serveur refuse de démarrer sur une base sans replica set. Hors production, il avertit seulement.

## Garde-fous des tests

- `NODE_ENV=test` : la base utilisée est toujours `TEST_DATABASE_URL`, jamais `DATABASE_URL` (retirée de l'environnement des tests).
- Le nom de la base de test doit contenir le mot « test » ; sinon toute la suite est refusée.
- `DATABASE_URL` ne peut pas viser une base nommée « test », ni la même base que `TEST_DATABASE_URL`.
- Sans `TEST_DATABASE_URL`, les tests créent une base temporaire en mémoire (`mongodb-memory-server`, replica set). Le premier lancement télécharge un binaire MongoDB (Internet requis). Si rien n'est disponible, les tests MongoDB réels sont **ignorés** (signalés « skipped ») ; `REQUIRE_DB_TESTS=1` les rend obligatoires.
- Aucun test ne vide une base dont le nom ne contient pas « test ».

## Authentification (phase B2)

Aucune inscription publique : il n'existe **aucune** route `register`/`signup`, et la base n'accepte jamais plus de deux comptes
(`partnerNumber` 1 ou 2, unique). Les comptes seront créés par un script contrôlé (phase B3).

| Route | Rôle |
|---|---|
| `POST /api/auth/login` | `{ email, password }` → pose les cookies, renvoie `{ data: { user, accessExpiresAt, refreshExpiresAt } }` |
| `POST /api/auth/refresh` | renouvelle la session (refresh token en cookie), **rotation** à chaque appel |
| `POST /api/auth/logout` | révoque la session et supprime les cookies (idempotent) |
| `GET /api/auth/me` | utilisateur connecté (`id`, `name`, `email`, `partnerNumber`) |

Mécanismes :
- mots de passe hachés en **Argon2id** (19 Mio, 2 itérations) ; empreinte factice pour égaliser le temps de réponse d'un email inconnu ;
- **JWT d'accès** HS256 (algorithme imposé), 15 min, claims `sub`/`sid`/`typ` seulement ; **refresh token** aléatoire de 256 bits, stocké uniquement en **SHA-256** dans `Session` ;
- jetons uniquement dans des cookies **HttpOnly** (`dc_access` sur `/api`, `dc_refresh` sur `/api/auth`), `Secure` en production, `SameSite` configurable ; jamais dans le JSON ni dans les journaux ;
- à chaque requête privée : JWT valide, session non révoquée/expirée, utilisateur actif en base ;
- **rotation** du refresh token ; le réutiliser après rotation révoque toute la famille (`REUSE_DETECTED`) et écrit un `AuditLog` ;
- email inconnu, mot de passe faux, compte désactivé ou verrouillé : **même réponse 401** ;
- verrouillage du compte 15 min après 5 échecs ; limite par IP (10 échecs / 15 min, 429) ;
- protection CSRF : requête modifiante venant d'une origine hors `FRONTEND_URL` → 403, en plus de CORS et SameSite ;
- le frontend doit **sérialiser** les appels à `/refresh` (deux renouvellements simultanés = réutilisation) et envoyer `credentials: 'include'`.

Limites connues : derrière un proxy, régler `trust proxy` (sinon la limite par IP voit l'IP du proxy) ; le verrouillage par compte permet à
un tiers de bloquer 15 min un compte en devinant l'email (compromis assumé pour deux comptes, atténué par la limite par IP).

## Conventions

- Montants : entiers en FCFA. Fuseau métier : `Africa/Dakar`. Horodatages techniques : UTC.
- API versionnée : `/api/v1`. Succès : `{ "data": … }`. Erreur : `{ "error": { "code", "message", "requestId" } }`.
- Aucun détail interne dans les erreurs en production.
- Derrière un proxy (hébergement), configurer `trust proxy` avant d'exposer l'API (limitation de débit par IP).

## Structure

```
src/config      env, database, cors, constants
src/middlewares errorHandler, notFound, rateLimiter, requestLogger
src/routes      health.routes, index (/api/v1, vide en B0)
src/utils       AppError, response, logger
src/app.js      construction d'Express (sans effet de bord)
src/server.js   démarrage / arrêt propre
tests/unit, tests/integration, tests/helpers, tests/setup
```

## Phase B3 — Gestion des associés et création contrôlée des comptes

### Principes
- Exactement **deux** comptes : n°1 Mohamed Bakhoum, n°2 Cheikh Sow. Aucune inscription publique, aucun rôle, aucune hiérarchie : les deux associés ont les mêmes droits.
- Un compte ne se **supprime jamais** (le modèle `User` refuse toute suppression physique) : on le désactive. Cotisations, opérations, retraits et historique restent intacts.
- Index uniques en base sur `partnerNumber` (1 ou 2) et sur l'email : un troisième compte est impossible, même en contournant le code.

### Création initiale des comptes (côté serveur uniquement)
Aucune route HTTP ne crée de compte. Le script s'exécute **à la main**, une seule fois, sur votre PC :

```bash
npm run provision:partners -- --dry-run   # simulation : aucune écriture, aucun mot de passe demandé
npm run provision:partners                # création réelle
```
- terminal interactif obligatoire ; refuse `NODE_ENV=test` ; affiche la base cible et exige de retaper son nom exact ;
- emails et mots de passe saisis (mots de passe masqués, saisis deux fois, politique : 12 caractères minimum, ni nom ni email, pas de mot courant) ; aucun mot de passe par défaut ni en argument ni dans `.env` ;
- mots de passe hachés en Argon2id ; les deux comptes sont créés dans **une seule transaction** (tout ou rien) ;
- si un compte existe déjà : rapport et **aucune modification** (pas de seconde initialisation) ; deux exécutions simultanées : une seule aboutit ;
- audit `USER_PROVISIONED` (sans secret).

### Routes `/api/v1/users` (toutes authentifiées)
| Méthode | Chemin | Effet |
|---|---|---|
| GET | `/` | les deux associés |
| GET | `/:id` | un associé |
| PATCH | `/me` | modifier son nom |
| PATCH | `/me/email` | changer son email (mot de passe actuel requis) |
| PATCH | `/me/password` | changer son mot de passe (mot de passe actuel requis) |
| POST | `/:id/deactivate` | désactiver l'**autre** associé (mot de passe requis) |
| POST | `/:id/activate` | réactiver l'autre associé (mot de passe requis) |

- Changer l'email ou le mot de passe révoque toutes les **autres** sessions (la session courante reste ouverte).
- Désactiver un compte révoque toutes ses sessions et bloque toute nouvelle connexion ; on ne peut pas désactiver son propre compte (un compte reste toujours actif).
- Actions sensibles limitées à 10 échecs / 15 min / IP (`TOO_MANY_ATTEMPTS`).
- Journal d'audit : `USER_PROFILE_UPDATED`, `USER_EMAIL_CHANGED`, `USER_PASSWORD_CHANGED`, `USER_DEACTIVATED`, `USER_ACTIVATED` (jamais de mot de passe ni d'empreinte).

## Cotisations (Phase D)

Routes `/api/v1/contributions` (authentification obligatoire, mêmes droits pour les deux associés) :

| Route | Rôle |
|---|---|
| `GET /` | Liste paginée. Filtres : `partnerId`, `period` (AAAA-MM), `year`, `from`, `to` (dates de versement), `page`, `pageSize` (≤ 100). Réponse : `{ data: { contributions }, meta: { page, pageSize, total, totalPages, filteredAmount } }` |
| `GET /summary` | Statistiques à la date du jour : encaissé réel, objectifs, reste, taux, mois en retard, par associé et collectif |
| `GET /:id` | Détail d'une cotisation |
| `POST /` | Enregistre un versement réel. En-tête `Idempotency-Key` (8 à 128 caractères) **obligatoire** |

Règles : montant entier de FCFA strictement positif, jamais plafonné (le 15 000 FCFA est un objectif, pas une limite) ; plusieurs versements possibles pour un même mois ; mois et date interdits avant `FUND_START_PERIOD` et dans le futur (Africa/Dakar) ; l'associé concerné doit exister et être actif ; l'auteur vient de la session. Un renvoi avec la même clé rejoue la réponse sans second enregistrement ; un versement identique récent (autre clé) est refusé (`DUPLICATE_SUSPECTED`) sauf `confirmDuplicate: true`.

Il n'existe volontairement **aucune route de modification ni de suppression** : une cotisation est un mouvement réel immuable. Chaque création est journalisée (`CONTRIBUTION_CREATED`).

`FUND_START_PERIOD=2026-12` doit figurer dans votre `.env` : sans elle, l'enregistrement est refusé (`FUND_START_NOT_CONFIGURED`) et les objectifs sont « non calculables ».

## Activités commerciales (Phase E)

Routes `/api/v1/activities` (authentification obligatoire, mêmes droits pour les deux associés) :

| Route | Rôle |
|---|---|
| `GET /` | Liste : `search` (nom), `status`, `category`, `sort`, `page`, `pageSize` (≤ 50). Les archivées n'apparaissent que si `status=ARCHIVED`. `meta.counts` donne le nombre d'activités par statut |
| `POST /` | Création (toujours `ACTIVE`) |
| `GET /:id` | Détail + totaux financiers en lecture seule |
| `PATCH /:id` | Modification : nom, description, catégorie, dates (jamais le statut ni les opérations) |
| `POST /:id/suspend` `reactivate` `complete` `reopen` `archive` | Changements de statut |

Statuts : `ACTIVE`, `SUSPENDED`, `COMPLETED`, `ARCHIVED`. Transitions : ACTIVE ⇄ SUSPENDED ; ACTIVE/SUSPENDED → COMPLETED (date de fin) ; COMPLETED → ACTIVE (réouverture, **motif obligatoire**, tracé) ; ACTIVE/SUSPENDED/COMPLETED → ARCHIVED (définitif). **Aucune route de suppression** : le modèle l'interdit, l'historique financier est conservé. Chaque écriture est journalisée dans `AuditLog`.

## Trésorerie (Phase F)

Routes `/api/v1/treasury` (authentification obligatoire, lecture seule, mêmes données pour les deux associés) :

| Route | Rôle |
|---|---|
| `GET /summary` | Solde, entrées, sorties, totaux par type (cotisations, recettes, investissements, dépenses, retraits), nombre de mouvements, dernier mouvement, évolution mensuelle, décomposition du calcul |
| `GET /movements` | Historique : `search`, `type`, `direction`, `category` (catégorie de l'activité), `partnerId`, `from`, `to`, `sort` (`date_desc`, `date_asc`, `amount_desc`, `amount_asc`), `page`, `pageSize` (≤ 100). `meta.filtered` donne les totaux de tout l'ensemble filtré |
| `GET /movements/:type/:id` | Détail d'un mouvement (type = `CONTRIBUTION`, `REVENUE`, `INVESTMENT`, `EXPENSE`, `WITHDRAWAL`, id = identifiant de l'enregistrement d'origine) |

**Solde** = cotisations + recettes − investissements − dépenses − retraits, à la date du jour (Africa/Dakar). Les mouvements datés dans le futur et les enregistrements supprimés logiquement ne sont pas comptés ; aucun solde d'ouverture n'existe. Les calculs réutilisent ceux du Dashboard (`normalizeMovements`, `signed`, `buildSeries`) : aucun enregistrement n'est copié, un mouvement est toujours une ligne de son enregistrement d'origine.

**Garde des sorties** (`services/treasury/outflowGuard.js`, via `treasuryService.guard.runOutflow`) : à utiliser par tout service qui crée un retrait, un investissement ou une dépense. Dans UNE transaction MongoDB, elle incrémente d'abord le document unique `TreasuryLock` (les sorties simultanées se heurtent à un conflit d'écriture, rejoué sur le solde à jour), relit le solde, refuse (`409 INSUFFICIENT_TREASURY`) si le montant dépasse le solde disponible, puis exécute l'écriture et son AuditLog dans la même transaction. Un refus n'écrit rien. Les retraits (Phase G) l'utilisent ; les futurs investissements et dépenses devront passer par elle aussi.

## Retraits (Phase G)

Routes `/api/v1/withdrawals` (authentification obligatoire, mêmes droits pour les deux associés) :

| Route | Rôle |
|---|---|
| `GET /summary` | Nombre de retraits, montant total, total par bénéficiaire, 5 derniers retraits, solde disponible (celui de la trésorerie) |
| `GET /` | Liste : `search` (motif, noms, montant), `beneficiaryId`, `authorId`, `from`, `to`, `sort` (`date_desc`, `date_asc`, `amount_desc`, `amount_asc`), `page`, `pageSize` (≤ 100). `meta.filteredAmount` = total de l'ensemble filtré |
| `GET /:id` | Détail d'un retrait |
| `POST /` | Création (en-tête `Idempotency-Key` obligatoire) : `beneficiaryId`, `amount`, `withdrawalDate`, `reason` facultatif |
| `PATCH /:id` | Modification : `beneficiaryId`, `amount`, `withdrawalDate`, `reason` (au moins un champ) |
| `DELETE /:id` | Suppression **logique**, motif facultatif `{ "reason": "..." }` |

Règles : l'auteur (`recordedBy`) vient toujours de la session et n'est jamais modifiable ; le bénéficiaire est choisi explicitement (associé existant et actif) ; montant entier de FCFA > 0 ; date ≤ aujourd'hui (Africa/Dakar). Création, modification et suppression passent par la garde atomique de la Phase F (`treasuryService.guard`) : verrou `TreasuryLock`, solde relu dans la transaction, `409 INSUFFICIENT_TREASURY` si le solde ne suffit pas, rien n'est écrit en cas de refus. Une modification n'est contrôlée que si elle AUGMENTE le montant (l'augmentation doit tenir dans le solde actuel). La création est idempotente : clé, retrait, audit et réponse sont écrits dans la même transaction ; un rejeu est rendu tel quel (`Idempotent-Replayed: true`) même si le solde ne suffirait plus. Audit : `WITHDRAWAL_CREATED`, `WITHDRAWAL_UPDATED` (avant/après), `WITHDRAWAL_DELETED`.

## Historique (phase Historique)

Routes `/api/v1/history` (authentification obligatoire, **lecture seule**, mêmes données pour les deux associés ; aucune route d'écriture) :

| Route | Rôle |
|---|---|
| `GET /summary` | Totaux par type (cotisations, revenus, investissements, dépenses, retraits), entrées, sorties, solde net, nombre d'opérations, résultat commercial (calcul du Dashboard), associés et activités pour les filtres |
| `GET /` | Opérations : `search`, `type`, `direction` (`IN`/`OUT`), `partnerId`, `activityId` (ou `none` = sans activité), `period` (`today`, `week`, `month`, `quarter`, `year`, `all`, `custom`), `from`, `to`, `sort` (`date_desc`, `date_asc`, `amount_desc`, `amount_asc`), `page`, `limit` (≤ 100). `meta` : `page`, `limit`, `total`, `totalPages`, `filtered` (totaux de tout l'ensemble filtré) |
| `GET /:type/:id` | Détail d'une opération (type = `CONTRIBUTION`, `REVENUE`, `INVESTMENT`, `EXPENSE`, `WITHDRAWAL`) |

Aucun calcul n'est dupliqué : les opérations, totaux, filtres, tris et détails viennent du registre de la trésorerie (`services/treasury/ledger.js`, lui-même bâti sur le calculateur du Dashboard) et le résultat commercial du Dashboard. Seules les opérations déjà survenues (date ≤ aujourd'hui, Africa/Dakar) sont listées et comptées ; les enregistrements supprimés logiquement ne sont jamais chargés. Un détail peut afficher une opération future, signalée `countedInBalance: false`. Un bénéfice calculé n'est jamais une opération ni une entrée.

## Statistiques (phase Statistiques)

Route `GET /api/v1/statistics` (authentification obligatoire, **lecture seule**, mêmes statistiques pour les deux associés ; aucune route d'écriture, aucun nouveau modèle, aucune collection parallèle).

Paramètres : `period` = `week`, `month`, `last3months`, `last6months`, `year`, `all` (défaut), `custom` ; `from` et `to` (`AAAA-MM-JJ`) obligatoires pour `custom` et refusés sinon ; tout autre paramètre est refusé (400).

| Période | Intervalle (bornes incluses, fuseau Africa/Dakar) |
|---|---|
| `week` / `month` / `year` | du lundi / du 1er du mois / du 1er janvier, jusqu'à aujourd'hui |
| `last3months` / `last6months` | de (aujourd'hui − 3 ou 6 mois + 1 jour) à aujourd'hui |
| `all` | de la première opération à aujourd'hui |
| `custom` | dates fournies ; la fin est plafonnée à aujourd'hui |

Réponse (`data`) : `period`, `totals` (par type `{ amount, count }`, `inflow`, `outflow`, `commercialResult`, `netBalance`, `operationsCount`), `counts` (par type, activités, mois), `monthly` (un élément par mois, zéros pour un mois sans opération), `expensesByCategory`, `activities`, `contributionComparison` (par associé et par mois), `previousPeriod` (totaux de la période équivalente précédente, `null` pour `all`), `futureIgnored`, `notices`, `asOf`, `generatedAt`.

Règles : entrées = cotisations + recettes ; sorties = investissements + dépenses + retraits ; solde net = entrées − sorties (égal au solde de la Trésorerie pour `all`). **Résultat commercial = recettes − dépenses − investissements** (le résultat d'exploitation du Dashboard exclut les investissements) ; c'est un calcul, jamais ajouté aux entrées. Les opérations futures et les enregistrements supprimés logiquement ne sont jamais comptés. Catégorie d'une dépense = catégorie réelle de l'activité (« Non catégorisé » sinon, identifiant `null`). Comparaison des associés : mois = mois concerné (`period`) ; objectif de 15 000 FCFA par mois à partir de `FUND_START_PERIOD` seulement (indisponible si non configuré) ; les montants cotisés ne sont jamais plafonnés, seul le pourcentage d'atteinte l'est (100 %). L'évolution mensuelle suit la date réelle du versement. Les calculs sont dans `services/statistics/calculator.js` (fonctions pures, bâties sur `normalizeMovements` du Dashboard).

## Paramètres (phase Paramètres, backend)

Routes `/api/v1/settings` (authentification obligatoire, `Cache-Control: no-store`). Le propriétaire des préférences est **toujours** l'utilisateur de la session ; aucun identifiant d'utilisateur n'est accepté dans une requête (champ inconnu = 400).

| Route | Rôle |
|---|---|
| `GET /settings` | identité officielle (nom, slogan, devise XOF — non modifiables), description et informations du projet, les deux associés réels, objectifs (15 000 FCFA par associé, 30 000 collectif, `FUND_START_PERIOD`, tous repris de la configuration), `fund.version` |
| `PUT /settings` | modifie `description` (10 à 300 caractères) et/ou `projectInfo` (500 maximum). Corps : `{ expectedVersion, description?, projectInfo? }`. **409 `SETTINGS_VERSION_CONFLICT`** si `expectedVersion` n'est plus la version courante. Tout autre champ est refusé (400) |
| `GET /settings/preferences` | préférences de l'associé connecté (valeurs par défaut sans écriture s'il n'en a jamais enregistré) |
| `PUT /settings/preferences` | modification partielle : `theme` (`light`/`dark`), `amountSeparator` (`space`/`dot`/`none`), `visualNotificationsEnabled`, `contributionRemindersEnabled` |
| `POST /settings/preferences/reset` | remet **ses** préférences aux valeurs par défaut (corps vide) ; ne touche jamais aux paramètres communs |
| `GET /settings/contribution-reminders` | rappels de cotisation calculés à partir des vraies cotisations |
| `GET /settings/security` | informations de sécurité du compte et de ses sessions actives |

Modèles : `FundSettings` (un seul document, `_id` fixe, compteur `version`, dernier auteur) et `UserPreferences` (un document par associé, index unique sur `user`). Les valeurs par défaut sont renvoyées **sans écriture** tant qu'aucune modification explicite n'a eu lieu (version 0 pour les paramètres communs) ; la première modification crée le document. Aucune suppression physique (refusée par le modèle) : « réinitialiser » réécrit les valeurs par défaut.

Concurrence : la version attendue est vérifiée dans une transaction ; deux modifications simultanées de la même version ne peuvent pas toutes deux aboutir (la seconde reçoit 409). Une modification identique à l'état courant n'écrit rien. Chaque modification réussie des paramètres communs est inscrite dans `AuditLog` (`SETTINGS_UPDATED`, ressource `SETTINGS`, auteur, avant/après, jamais de secret). Les préférences personnelles ne sont pas auditées.

Rappels : `services/settings/reminders.js` s'appuie sur `computeContributionSummary` (aucun calcul dupliqué). Sont renvoyés le mois courant (atteint ou à compléter) et les mois passés réellement incomplets depuis `FUND_START_PERIOD`, pour **les deux** associés : objectif, montant réellement cotisé (cumul des versements du mois, jamais plafonné), reste, pourcentage (plafonné à 100 %), statut `ACHIEVED` ou `TO_COMPLETE`. Cotisations supprimées et futures exclues ; aucun rappel avant le début du fonds ni sans `FUND_START_PERIOD` ; aucune cotisation n'est jamais créée. Si l'associé connecté a désactivé `contributionRemindersEnabled`, la réponse est `{ enabled: false, months: [], pendingCount: 0 }` (l'autre associé n'est pas touché). `visualNotificationsEnabled` ne change pas ces données : il servira au frontend à masquer la pastille et le bandeau.

Sécurité : la route `/settings/security` ne renvoie que les informations du compte connecté et de ses sessions actives (dates, navigateur, adresse IP), jamais de mot de passe, d'empreinte, de jeton ni de secret. Les notifications par email ne sont **pas disponibles** : aucun SMTP, aucun envoi, aucune préférence d'email.
