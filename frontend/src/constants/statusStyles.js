// Libellé et couleur (tone de StatusBadge) de chaque statut renvoyé par les données.

export const BUSINESS_STATUSES = {
  completed: { label: 'Terminé', tone: 'success' },
  ongoing: { label: 'En cours', tone: 'info' },
}

export const CONTRIBUTION_STATUSES = {
  paid: { label: 'Payé', tone: 'success' },
  pending: { label: 'En attente', tone: 'warning' },
  late: { label: 'En retard', tone: 'danger' },
}
