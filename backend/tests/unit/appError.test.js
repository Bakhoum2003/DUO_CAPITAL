import { describe, expect, it } from 'vitest'
import { AppError } from '../../src/utils/AppError.js'
import { sendSuccess } from '../../src/utils/response.js'

describe('AppError', () => {
  it('porte statut, code et message', () => {
    const err = new AppError({ status: 404, code: 'NOT_FOUND', message: 'Introuvable.' })
    expect(err).toBeInstanceOf(Error)
    expect(err.status).toBe(404)
    expect(err.code).toBe('NOT_FOUND')
    expect(err.message).toBe('Introuvable.')
    expect(err.isOperational).toBe(true)
  })

  it('a des valeurs par défaut (500)', () => {
    const err = new AppError()
    expect(err.status).toBe(500)
    expect(err.code).toBe('INTERNAL_SERVER_ERROR')
  })

  it("conserve l'erreur d'origine dans cause", () => {
    const cause = new Error('origine')
    expect(new AppError({ cause }).cause).toBe(cause)
  })
})

function fakeRes() {
  const res = { statusCode: 0, body: undefined }
  res.status = (code) => ((res.statusCode = code), res)
  res.json = (body) => ((res.body = body), res)
  return res
}

describe('sendSuccess', () => {
  it('enveloppe les données dans { data }', () => {
    const res = fakeRes()
    sendSuccess(res, { a: 1 })
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ data: { a: 1 } })
  })

  it('accepte un statut et des meta', () => {
    const res = fakeRes()
    sendSuccess(res, [], { status: 201, meta: { total: 0 } })
    expect(res.statusCode).toBe(201)
    expect(res.body).toEqual({ data: [], meta: { total: 0 } })
  })
})
