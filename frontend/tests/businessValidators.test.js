import { describe, expect, it } from 'vitest'
import { validateBusinessForm, validateOperationForm } from '../src/utils/businessValidators'

const businessContext = {
  todayIso: '2026-11-12',
  categoryValues: ['drinks', 'food'],
  statusValues: ['ongoing', 'completed'],
  associateIds: ['mohamed-bakhoum', 'cheikh-sow'],
  otherBusinessNames: ['Vente de snacks'],
}
const validBusiness = { name: 'Vente de jus', category: 'drinks', description: '', launchDate: '2026-11-01', initialInvestment: '25 000', responsibleId: '', status: 'ongoing' }

describe('validateBusinessForm', () => {
  it('accepte un formulaire valide', () => {
    expect(validateBusinessForm(validBusiness, businessContext)).toEqual({})
  })

  it('signale les champs obligatoires', () => {
    const errors = validateBusinessForm({ ...validBusiness, name: ' ', category: '', launchDate: '', initialInvestment: '' }, businessContext)
    expect(errors.name).toBe('Le nom du business est obligatoire.')
    expect(errors.category).toBe('Veuillez choisir une catégorie.')
    expect(errors.launchDate).toBe('La date de lancement est obligatoire.')
    expect(errors.initialInvestment).toBe('Le montant est obligatoire.')
  })

  it('refuse un nom en doublon (accents et casse ignorés)', () => {
    expect(validateBusinessForm({ ...validBusiness, name: 'VENTE DE SNACKS' }, businessContext).name).toBe('Un business porte déjà ce nom.')
  })

  it('refuse un montant invalide, nul, négatif ou trop grand', () => {
    expect(validateBusinessForm({ ...validBusiness, initialInvestment: 'abc' }, businessContext).initialInvestment).toContain('en chiffres')
    expect(validateBusinessForm({ ...validBusiness, initialInvestment: '0' }, businessContext).initialInvestment).toBe('Le montant doit être supérieur à 0.')
    expect(validateBusinessForm({ ...validBusiness, initialInvestment: '-5' }, businessContext).initialInvestment).toContain('en chiffres')
    expect(validateBusinessForm({ ...validBusiness, initialInvestment: '999999999999' }, businessContext).initialInvestment).toContain('ne peut pas dépasser')
  })

  it('refuse une date de lancement dans le futur', () => {
    expect(validateBusinessForm({ ...validBusiness, launchDate: '2026-12-01' }, businessContext).launchDate).toBe('La date de lancement ne peut pas être dans le futur.')
  })

  it('refuse un lancement postérieur à la première opération', () => {
    const errors = validateBusinessForm(validBusiness, { ...businessContext, earliestOperationDate: '2026-10-20' })
    expect(errors.launchDate).toContain('20/10/2026')
  })

  it('accepte un responsable vide mais refuse un associé inconnu', () => {
    expect(validateBusinessForm({ ...validBusiness, responsibleId: 'cheikh-sow' }, businessContext)).toEqual({})
    expect(validateBusinessForm({ ...validBusiness, responsibleId: 'inconnu' }, businessContext).responsibleId).toBe('Associé inconnu.')
  })

  it('limite la description', () => {
    expect(validateBusinessForm({ ...validBusiness, description: 'a'.repeat(301) }, businessContext).description).toContain('300')
  })
})

const operationContext = {
  todayIso: '2026-11-12',
  launchDate: '2026-11-01',
  associateIds: ['mohamed-bakhoum', 'cheikh-sow'],
  expenseCategoryValues: ['goods', 'transport'],
}
const validOperation = { type: 'revenue', amount: '15000', date: '2026-11-05', associateId: 'cheikh-sow', expenseCategory: '', description: '' }

describe('validateOperationForm', () => {
  it('accepte une recette valide sans catégorie de dépense', () => {
    expect(validateOperationForm(validOperation, operationContext)).toEqual({})
  })

  it('exige une catégorie pour une dépense', () => {
    expect(validateOperationForm({ ...validOperation, type: 'expense' }, operationContext).expenseCategory).toBe('Veuillez choisir une catégorie de dépense.')
    expect(validateOperationForm({ ...validOperation, type: 'expense', expenseCategory: 'goods' }, operationContext)).toEqual({})
  })

  it('exige un associé, un montant et une date', () => {
    const errors = validateOperationForm({ ...validOperation, associateId: '', amount: '', date: '' }, operationContext)
    expect(errors.associateId).toBe("Veuillez choisir l'associé concerné.")
    expect(errors.amount).toBe('Le montant est obligatoire.')
    expect(errors.date).toBe("La date de l'opération est obligatoire.")
  })

  it('refuse une date future ou antérieure au lancement', () => {
    expect(validateOperationForm({ ...validOperation, date: '2026-11-20' }, operationContext).date).toBe('La date ne peut pas être dans le futur.')
    expect(validateOperationForm({ ...validOperation, date: '2026-10-31' }, operationContext).date).toContain('01/11/2026')
  })

  it('refuse un montant nul', () => {
    expect(validateOperationForm({ ...validOperation, amount: '0' }, operationContext).amount).toBe('Le montant doit être supérieur à 0.')
  })
})
