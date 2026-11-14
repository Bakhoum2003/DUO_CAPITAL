// Réglages du module Paramètres.
//
// Deux familles de paramètres, enregistrées côté serveur (MongoDB) :
// - paramètres COMMUNS du fonds : description et informations du projet (partagés par les deux associés) ;
// - préférences PERSONNELLES : thème, format des montants, notifications visuelles, rappels (propres à chaque associé).
// Les constantes SETTINGS_STORAGE_KEY et DEFAULT_SETTINGS ne servent plus qu'aux anciens validateurs et à leurs tests.
// Les identités (nom, slogan, devise), les associés et les objectifs sont en LECTURE SEULE : ils viennent
// des mêmes constantes que Cotisations, Dashboard et Statistiques, afin de rester cohérents partout.

export const SETTINGS_STORAGE_KEY = 'duo-capital:settings:v1'
export const SETTINGS_CHANGED_EVENT = 'duo-capital:settings-changed'

export const APP_IDENTITY = {
  name: 'DUO CAPITAL',
  slogan: 'Ensemble, plus loin !',
  currencyCode: 'XOF',
  currencyLabel: 'FCFA (XOF)',
  language: 'Français',
  version: '1.0.0',
  aboutText: 'Une application conçue pour vous aider à gérer votre capital et saisir les meilleures opportunités.',
}

export const ASSOCIATE_ROLE_LABEL = 'Associé'

export const DESCRIPTION_MIN_LENGTH = 10
export const DESCRIPTION_MAX_LENGTH = 300
export const PROJECT_INFO_MAX_LENGTH = 500
export const ASSOCIATE_NAME_MIN_LENGTH = 2
export const ASSOCIATE_NAME_MAX_LENGTH = 60
export const EXPECTED_ASSOCIATE_COUNT = 2

// Séparateur des milliers pour l'affichage des montants (espace insécable, comme aujourd'hui).
export const AMOUNT_FORMATS = {
  space: { label: 'Espace : 410 000 FCFA', separator: '\u00A0' },
  dot: { label: 'Point : 410.000 FCFA', separator: '.' },
  none: { label: 'Sans séparateur : 410000 FCFA', separator: '' },
}

export const AMOUNT_FORMAT_OPTIONS = Object.entries(AMOUNT_FORMATS).map(([value, format]) => ({
  value,
  label: format.label,
}))

export const DEFAULT_SETTINGS = {
  general: {
    description:
      "Fonds d'investissement commun de deux associés, Mohamed Bakhoum et Cheikh Sow : cotisations mensuelles, activités commerciales et suivi des résultats.",
    projectInfo: 'Objectif : faire fructifier le capital en finançant ensemble de petites activités commerciales.',
  },
  preferences: {
    amountFormat: 'space',
    visualNotifications: true,
  },
}
