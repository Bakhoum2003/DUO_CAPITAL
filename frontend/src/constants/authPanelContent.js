import { ROUTES } from '../routes/routePaths'

// Contenu du panneau vert (partie gauche) selon la page d'authentification.
export const AUTH_PANEL_CONTENT = {
  [ROUTES.REGISTER]: {
    title: 'Construisons notre capital,',
    highlightedTitle: 'réalisons nos projets !',
    description: '',
    features: [
      'Gérez vos cotisations',
      'Suivez vos investissements',
      'Analysez vos bénéfices',
      'Développez vos affaires',
    ],
    illustration: 'growth',
  },
  [ROUTES.LOGIN]: {
    title: 'Bienvenue de',
    highlightedTitle: 'nouveau !',
    description: 'Connectez-vous pour continuer à gérer votre capital ensemble.',
    features: [],
    illustration: 'fistBump',
  },
}
