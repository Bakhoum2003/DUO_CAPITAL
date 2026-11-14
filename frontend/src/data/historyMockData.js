// Retraits de trésorerie (données de démonstration). Les cotisations, investissements, dépenses et
// recettes viennent des modules Cotisations et Business ; l'Historique n'a donc pas de doublon.
// Montants en FCFA ; dates au format « AAAA-MM-JJ ».
export const MOCK_WITHDRAWALS = [
  { id: 'withdrawal-001', associateId: 'mohamed-bakhoum', amount: 10000, date: '2026-08-28', description: 'Retrait pour frais de déplacement' },
  { id: 'withdrawal-002', associateId: 'cheikh-sow', amount: 15000, date: '2026-09-30', description: 'Retrait exceptionnel (urgence familiale)' },
  { id: 'withdrawal-003', associateId: 'mohamed-bakhoum', amount: 5000, date: '2026-10-20', description: 'Retrait pour frais de téléphone et de connexion' },
]
