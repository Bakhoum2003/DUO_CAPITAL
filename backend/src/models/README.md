# Modèles MongoDB (phase B1)

Huit modèles Mongoose, **sans routes, contrôleurs ni services** (phases suivantes). Importer `src/models/index.js`
enregistre les modèles ; B1 ne l'importe pas depuis le serveur.

| Modèle | Rôle | Suppression | Particularités |
|---|---|---|---|
| `User` | un des deux associés | — | `partnerNumber` 1/2 unique ⇒ jamais plus de deux comptes ; aucun rôle ; `passwordHash` (argon2/bcrypt) masqué |
| `Session` | un refresh token émis | TTL (7 j après expiration) | empreinte SHA-256 seulement, famille de rotation, révocation datée + motif |
| `Contribution` | cotisation | logique | plusieurs par associé et par mois, période ≠ date possible, sans plafond |
| `Business` | activité | jamais (archivage) | statuts ACTIVE/COMPLETED/ARCHIVED, `reopenHistory` |
| `BusinessOperation` | INVESTMENT / EXPENSE / REVENUE | logique | auteur ≠ associé concerné, justificatif, type immuable |
| `Withdrawal` | retrait d'un associé | logique | bénéficiaire ≠ auteur possible |
| `AuditLog` | journal | jamais, jamais modifié | secrets refusés dans before/after, tout immuable |
| `IdempotencyKey` | anti-doublon | TTL 24 h | unique (acteur, clé), empreinte de requête, réponse rejouable |

## Conventions
- Montants : entiers FCFA ≥ 1 (`Number.isSafeInteger`) ; aucun décimal.
- Dates métier : chaîne `AAAA-MM-JJ` (date seule, aucun décalage de fuseau possible, validée au calendrier) ; périodes `AAAA-MM`.
  Le « aujourd'hui » métier se calcule en `Africa/Dakar` dans les services. Horodatages techniques (`createdAt`, `updatedAt`, `occurredAt`) : `Date` UTC.
- `strict: 'throw'` : un champ inconnu est refusé. `optimisticConcurrency` sur les modèles modifiables (transactions MongoDB futures).
- JSON sérialisé : `id` (chaîne), sans `_id`, `__v`, `passwordHash` ni `refreshTokenHash`.

## Garanti par le schéma
Types, enums, montants entiers positifs, dates valides, cohérence interne (deletedAt ⇔ deletedBy, revokedAt ⇔ revokedReason,
fin ≥ début, COMPLETED ⇒ endDate, COMPLETED ⇒ réponse enregistrée), unicités (email, associé, empreinte de session, acteur+clé),
refus de suppression physique via Mongoose, immuabilité d'`AuditLog`, absence de secret dans l'audit.

## À imposer par les services (impossible ou dangereux dans un schéma)
1. **Trésorerie jamais négative** (retrait, dépense, etc.) : lecture de plusieurs collections ⇒ service + transaction MongoDB.
2. **Aucune opération sur une activité terminée** (ou archivée) tant qu'elle n'est pas rouverte ⇒ le service lit `Business.status`.
3. **Transitions de statut d'une activité** et renseignement de `completedAt/By`, `archivedAt/By`, `reopenHistory` + entrée `AuditLog`.
4. **Existence des références** (`business`, `partner`…), compte actif, associé concerné cohérent.
5. **Création des deux comptes** par script contrôlé (pas d'inscription publique) ; rotation/réutilisation des sessions.
6. **Écriture de l'`AuditLog` et de l'`IdempotencyKey` dans la même transaction** que l'opération métier.
7. **Nom d'activité en doublon** : `nameKey` est indexé, non unique.
8. **Investissement initial** : créer une vraie opération INVESTMENT (aucun champ « investissement initial » sur Business).
9. **Pas de distribution automatique des bénéfices** : aucun modèle de résultat/bénéfice n'existe (un calcul n'est jamais un mouvement).

## Limite des garde-fous Mongoose
Les refus de suppression/modification passent par l'API Mongoose. Un accès direct au driver (`collection.deleteMany`, `bulkWrite`,
mongosh) les contourne : en production, l'utilisateur MongoDB de l'application ne doit pas avoir les droits `remove` sur les
collections financières ni `update`/`remove` sur `auditlogs`.

## Index
Déclarés dans chaque schéma (noms explicites). Mongoose les crée à la première connexion d'une application qui importe les modèles
(`autoIndex`) : opération non destructive, mais c'est une écriture sur la base — à anticiper avant de brancher les services sur Atlas.
