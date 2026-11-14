// Les deux associés de DUO CAPITAL (constantes métier, aucune donnée secrète).
// Les deux ont exactement les mêmes droits : le numéro n'est qu'un identifiant, pas un rang.

export const PARTNER_IDENTITIES = Object.freeze([
  Object.freeze({ partnerNumber: 1, name: 'Mohamed Bakhoum' }),
  Object.freeze({ partnerNumber: 2, name: 'Cheikh Sow' }),
])

export const PARTNER_COUNT = PARTNER_IDENTITIES.length
