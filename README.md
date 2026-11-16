# 💰 DUO CAPITAL

### Application de gestion financière et commerciale de deux associés

DUO CAPITAL est une application web de gestion financière conçue pour accompagner deux associés dans la gestion transparente, organisée et sécurisée de leur fonds commercial commun.

L'application centralise les cotisations, les investissements, les activités commerciales, les dépenses, les recettes, les bénéfices, les pertes et la trésorerie dans un espace unique.

Son objectif est de permettre aux associés de suivre précisément l'évolution de leur capital, de contrôler leurs opérations et de prendre des décisions financières sur la base de données fiables et actualisées.

---

## 📌 Présentation du projet

DUO CAPITAL est un projet développé pour répondre aux besoins réels de gestion d'une association commerciale composée exclusivement de deux associés :

- **Mohamed Bakhoum**
- **Cheikh Sow**

Les deux associés participent financièrement au développement d'un fonds commun destiné à financer différentes opportunités commerciales.

Le fonds peut être utilisé pour plusieurs types d'activités selon les opportunités disponibles.

Contrairement à une application conçue pour une seule activité commerciale, DUO CAPITAL permet de gérer plusieurs activités au sein d'une même structure financière.

### Objectifs principaux

- Centraliser toutes les informations financières.
- Suivre les cotisations mensuelles des associés.
- Enregistrer et suivre les investissements.
- Gérer les différentes activités commerciales.
- Enregistrer les recettes et les dépenses.
- Calculer les bénéfices et les pertes.
- Suivre la trésorerie disponible.
- Conserver un historique détaillé des opérations.
- Garantir la transparence entre les deux associés.
- Sécuriser l'accès aux informations financières.

---



# 🚀 Fonctionnalités principales

## 1. Tableau de bord

Le tableau de bord constitue l'espace principal de l'application.

Il permet d'obtenir une vue d'ensemble de la situation financière du fonds.

Il regroupe notamment :

- Le capital disponible.
- Le total des cotisations.
- Le montant des investissements.
- Les recettes enregistrées.
- Les dépenses effectuées.
- Les bénéfices et les pertes.
- La situation de la trésorerie.
- Les indicateurs essentiels des activités commerciales.

Le tableau de bord permet aux associés de comprendre rapidement la situation globale de leur fonds.

## 2. Gestion des cotisations

Ce module permet de suivre les contributions financières des deux associés.

Fonctionnalités :

- Enregistrement des cotisations.
- Identification de l'associé ayant effectué une contribution.
- Suivi des cotisations mensuelles.
- Consultation des montants versés.
- Suivi de la situation des contributions.
- Consultation de l'historique des cotisations.

La contribution mensuelle prévue est de 15 000 FCFA par associé.

## 3. Gestion des activités commerciales

DUO CAPITAL permet de gérer plusieurs activités commerciales indépendantes au sein du même fonds.

Chaque activité possède ses propres informations de gestion.

Fonctionnalités :

- Création et suivi des activités.
- Enregistrement des investissements.
- Suivi des dépenses propres à chaque activité.
- Enregistrement des recettes.
- Calcul des résultats financiers.
- Suivi de la rentabilité.
- Consultation de l'évolution des activités.

L'objectif est de pouvoir diversifier les investissements sans perdre la maîtrise de la situation financière globale.

## 4. Gestion des investissements

Ce module permet de suivre les sommes engagées dans les différentes activités.

Il permet notamment de connaître :

- Les montants investis.
- L'activité concernée.
- La date de l'investissement.
- La nature de l'investissement.
- L'évolution des sommes engagées.

Les investissements sont intégrés au suivi financier général du fonds.

## 5. Gestion des dépenses et recettes

L'application centralise les mouvements financiers liés aux activités commerciales.

**Dépenses :**
- Enregistrement des dépenses.
- Identification de leur nature.
- Association à une activité.
- Suivi des montants dépensés.

**Recettes :**
- Enregistrement des entrées d'argent.
- Association aux activités concernées.
- Suivi des montants encaissés.
- Calcul des résultats financiers.

Ces informations permettent de déterminer les performances de chaque activité.

## 6. Gestion de la trésorerie

La trésorerie représente la situation financière disponible du fonds.

Ce module permet de suivre les mouvements financiers et de connaître la situation réelle des liquidités.

Il contribue à distinguer les sommes disponibles des montants déjà engagés dans les activités.

## 7. Historique

Le module Historique permet de retrouver les opérations effectuées dans DUO CAPITAL.

Il offre une traçabilité des différentes opérations financières.

Les associés peuvent consulter les événements enregistrés et suivre l'évolution de la gestion du fonds dans le temps.

## 8. Statistiques

Le module Statistiques permet d'obtenir une vision analytique des performances financières.

Il facilite notamment :

- L'analyse des recettes.
- Le suivi des dépenses.
- L'évolution des investissements.
- L'analyse des bénéfices et des pertes.
- La comparaison des performances des activités.
- Le suivi de l'évolution financière du fonds.

## 9. Paramètres

Le module Paramètres permet de gérer les configurations générales de l'application.

Il centralise notamment les paramètres liés à :

- La configuration générale.
- Les informations sociales.
- La gestion des commandes ou opérations concernées.
- L'apparence de l'application.

Les modifications sensibles sont réservées aux utilisateurs disposant des autorisations nécessaires.

---

# 🏗️ Architecture technique

DUO CAPITAL repose sur une architecture séparant le frontend et le backend.

Cette séparation facilite la maintenance, les évolutions et la sécurité de l'application.

## Frontend

Le frontend est responsable de l'interface utilisateur et des interactions avec les associés.

Technologies utilisées :

| Technologie | Utilisation |
|---|---|
| React | Construction de l'interface utilisateur |
| JavaScript | Logique applicative |
| Tailwind CSS | Mise en forme et design responsive |
| React Router DOM | Navigation entre les pages |
| Lucide React | Icônes et éléments visuels |
| Vitest | Tests automatisés |

Le frontend est organisé autour de composants réutilisables, de pages, de services et de modules fonctionnels.

## Backend

Le backend assure le traitement des opérations, la gestion des utilisateurs et la communication avec la base de données.

Technologies utilisées :

| Technologie | Utilisation |
|---|---|
| Node.js | Environnement d'exécution |
| Express.js | API et gestion des routes |
| MongoDB | Base de données |
| Vitest | Tests automatisés |

Le backend centralise les règles métier et les traitements financiers afin de garantir la cohérence des données.

## Base de données

MongoDB est utilisé pour conserver les informations de l'application.

La base de données permet notamment de gérer :

- Les utilisateurs.
- Les cotisations.
- Les activités commerciales.
- Les investissements.
- Les dépenses.
- Les recettes.
- Les opérations financières.
- Les paramètres.
- Les historiques.

Les données sont organisées de manière à faciliter leur consultation et leur évolution.

## Architecture générale

```text
DUO CAPITAL
│
├── frontend/
│   │
│   ├── Interface React
│   ├── Pages
│   ├── Composants
│   ├── Layouts
│   ├── Services API
│   ├── Gestion des états
│   ├── Navigation
│   └── Tests frontend
│
├── backend/
│   │
│   ├── API Express
│   ├── Routes
│   ├── Controllers
│   ├── Services métier
│   ├── Middlewares
│   ├── Modèles de données
│   ├── Configuration
│   └── Tests backend
│
└── README.md
```

Cette représentation présente les grandes responsabilités de chaque partie et ne constitue pas un inventaire exhaustif des fichiers du projet.

---

# 🔐 Sécurité et authentification

La sécurité est un élément essentiel de DUO CAPITAL, car l'application manipule des informations financières privées.

Les principaux mécanismes comprennent :

- Authentification des associés.
- Absence d'inscription publique.
- Gestion sécurisée des sessions.
- Cookies HttpOnly pour les mécanismes de session concernés.
- Protection des routes privées.
- Vérification des autorisations côté backend.
- Contrôle des accès selon les rôles enregistrés en base de données.
- Validation des données reçues par l'API.
- Protection contre les requêtes non autorisées.
- Gestion des erreurs d'authentification.
- Protection des opérations sensibles.

Les autorisations ne reposent pas uniquement sur les informations contenues dans les jetons d'authentification : les droits doivent également être vérifiés côté serveur.

---

# 📱 Progressive Web App (PWA)

DUO CAPITAL a vocation à être disponible sous forme de Progressive Web App.

L'objectif est de permettre aux associés d'installer l'application sur leurs appareils, notamment :

- Smartphones Android.
- Ordinateurs Windows.
- Navigateurs compatibles avec les fonctionnalités PWA.

L'expérience recherchée comprend :

- Installation depuis le navigateur.
- Icône personnalisée.
- Écran de lancement.
- Affichage en mode standalone.
- Interface adaptée aux appareils mobiles.
- Gestion des mises à jour.
- Chargement des ressources statiques nécessaires.

### Sécurité hors connexion

Les informations financières doivent rester protégées.

Le fonctionnement hors connexion ne doit jamais permettre de simuler une opération financière ou de présenter des données privées obsolètes comme étant actualisées.

Les opérations nécessitant le serveur doivent rester dépendantes d'une connexion Internet.

---

# 🎨 Expérience utilisateur

DUO CAPITAL privilégie une interface :

- Moderne.
- Simple.
- Professionnelle.
- Responsive.
- Facile à utiliser.
- Cohérente entre les différents modules.

L'objectif est de proposer une expérience agréable aussi bien sur ordinateur que sur smartphone.

L'interface doit permettre aux associés de retrouver rapidement les informations importantes sans complexité inutile.

---

# 🧪 Qualité et tests

La qualité du code et la fiabilité des fonctionnalités sont des priorités du projet.

Le développement s'appuie sur :

- Des tests unitaires.
- Des tests d'intégration.
- Des tests des règles métier.
- Des tests des services frontend.
- Des tests des routes backend.
- Des vérifications de sécurité.
- Des validations manuelles des fonctionnalités.

Chaque évolution doit préserver les fonctionnalités déjà validées.

La compilation, l'analyse statique du code et les tests automatisés font partie du processus de validation.

---

# 📈 Évolution du projet

DUO CAPITAL est conçu pour évoluer progressivement.

Les orientations futures peuvent notamment inclure :

- L'amélioration de l'analyse financière.
- L'enrichissement des statistiques.
- L'amélioration de l'expérience mobile.
- Le développement complet de l'expérience PWA.
- L'amélioration des outils de suivi des activités.
- De nouvelles fonctionnalités de gestion et de reporting.

Toute évolution doit respecter les règles de gestion et les besoins des deux associés.

---

# 🎯 Vision du projet

DUO CAPITAL ne se limite pas à un simple outil de comptabilité.

C'est un espace commun de gestion, de suivi et de prise de décision pour deux associés qui souhaitent développer leurs activités commerciales avec une organisation financière rigoureuse.

La vision est simple :

**Investir ensemble, gérer intelligemment, suivre chaque mouvement et construire durablement.**

---


*DUO CAPITAL — Construire ensemble, évoluer ensemble.*