// Représentation publique des opérations de l'Historique : les mêmes champs que les mouvements de la trésorerie
// (aucun email, aucune empreinte, aucun secret), choisis explicitement pour qu'un champ interne n'apparaisse jamais par accident.

const pick = (source, keys) => Object.fromEntries(keys.filter((key) => key in source).map((key) => [key, source[key]]))

const LIST_FIELDS = ['id', 'type', 'typeLabel', 'direction', 'amount', 'date', 'description', 'category', 'activity', 'partner', 'recordedBy', 'recordedAt', 'period', 'countedInBalance']
const DETAIL_FIELDS = [...LIST_FIELDS, 'signedAmount', 'updatedAt', 'origin', 'details']

export const toOperationView = (movement) => pick(movement, LIST_FIELDS)
export const toOperationDetail = (movement) => pick(movement, DETAIL_FIELDS)
