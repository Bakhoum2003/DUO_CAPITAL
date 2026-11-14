import { describe, expect, it } from 'vitest'
import {
  ConfigError,
  analyzeMongoUri,
  explainMongoUriProblem,
  assertSafeTestDatabaseUri,
  getTestDatabaseIssues,
  isTestDatabaseName,
  parseMongoUri,
  redactMongoUri,
} from '../../src/config/env.js'

describe('parseMongoUri', () => {
  it('extrait hôtes et nom de base', () => {
    expect(parseMongoUri('mongodb://127.0.0.1:27017/duo_capital_dev?replicaSet=rs0')).toMatchObject({
      hosts: '127.0.0.1:27017',
      databaseName: 'duo_capital_dev',
    })
  })

  it('gère les identifiants et mongodb+srv', () => {
    expect(parseMongoUri('mongodb+srv://u:p@cluster.example.net/ma_base?retryWrites=true').databaseName).toBe('ma_base')
  })

  it('retourne null pour une adresse invalide', () => {
    expect(parseMongoUri('postgres://x/y')).toBeNull()
    expect(parseMongoUri(undefined)).toBeNull()
  })
})

describe('redactMongoUri', () => {
  it('masque les identifiants', () => {
    expect(redactMongoUri('mongodb://u:p@h/db')).toBe('mongodb://***@h/db')
  })
  it('laisse intacte une adresse sans identifiants', () => {
    expect(redactMongoUri('mongodb://h/db')).toBe('mongodb://h/db')
  })
})

describe('isTestDatabaseName', () => {
  it.each(['duo_capital_test', 'test', 'test-db', 'app.test', 'duo_tests'])('« %s » est une base de test', (name) => {
    expect(isTestDatabaseName(name)).toBe(true)
  })
  it.each(['duo_capital', 'contest', 'latest', '', undefined])('« %s » n’est pas une base de test', (name) => {
    expect(isTestDatabaseName(name)).toBe(false)
  })
})

describe('getTestDatabaseIssues / assertSafeTestDatabaseUri', () => {
  it('accepte une base de test distincte', () => {
    expect(getTestDatabaseIssues('mongodb://h/duo_test', 'mongodb://h/duo_dev')).toEqual([])
    expect(() => assertSafeTestDatabaseUri('mongodb://h/duo_test')).not.toThrow()
  })

  it('refuse une base de production, avec ConfigError', () => {
    expect(() => assertSafeTestDatabaseUri('mongodb://h/duo_capital')).toThrow(ConfigError)
  })

  it('refuse la même base que DATABASE_URL', () => {
    expect(getTestDatabaseIssues('mongodb://h/duo_test', 'mongodb://h/duo_test').length).toBe(1)
  })

  it('ne divulgue pas les identifiants dans le message', () => {
    try {
      assertSafeTestDatabaseUri('mongodb://admin:secret-fictif@h/duo_capital')
    } catch (err) {
      expect(err.message).not.toContain('secret-fictif')
    }
  })
})

const ATLAS_URI = 'mongodb+srv://duo_user:Ab12cd@cluster0.ab1cd.mongodb.net/duo_capital_dev?retryWrites=true&w=majority&appName=Cluster0'

describe('URI MongoDB Atlas (mongodb+srv)', () => {
  it('accepte une URI Atlas complète avec paramètres et extrait la base', () => {
    expect(parseMongoUri(ATLAS_URI)).toEqual({
      hosts: 'cluster0.ab1cd.mongodb.net',
      databaseName: 'duo_capital_dev',
      identity: 'cluster0.ab1cd.mongodb.net/duo_capital_dev',
    })
    expect(analyzeMongoUri(ATLAS_URI).isSrv).toBe(true)
  })

  it('accepte une URI Atlas sans paramètres', () => {
    expect(parseMongoUri('mongodb+srv://u:p@cluster0.ab1cd.mongodb.net/duo_capital_dev').databaseName).toBe('duo_capital_dev')
  })

  it('accepte une URI Atlas sans nom de base (extraction vide, refus ensuite par la validation de l’environnement)', () => {
    expect(parseMongoUri('mongodb+srv://u:p@cluster0.ab1cd.mongodb.net/?retryWrites=true&w=majority').databaseName).toBe('')
    expect(parseMongoUri('mongodb+srv://u:p@cluster0.ab1cd.mongodb.net?retryWrites=true').databaseName).toBe('')
    expect(parseMongoUri('mongodb+srv://u:p@cluster0.ab1cd.mongodb.net').databaseName).toBe('')
  })

  it('refuse un port et plusieurs hôtes avec mongodb+srv', () => {
    expect(explainMongoUriProblem('mongodb+srv://u:p@cluster0.ab1cd.mongodb.net:27017/db')).toContain('port')
    expect(explainMongoUriProblem('mongodb+srv://u:p@a.example.net,b.example.net/db')).toContain('seul')
  })

  it('refuse un nom d’hôte sans domaine avec mongodb+srv', () => {
    expect(explainMongoUriProblem('mongodb+srv://u:p@localhost/db')).toContain('domaine')
  })
})

describe('URI locale (mongodb://)', () => {
  it('accepte une URI locale avec replica set', () => {
    expect(parseMongoUri('mongodb://127.0.0.1:27017/duo_capital_dev?replicaSet=rs0')).toEqual({
      hosts: '127.0.0.1:27017',
      databaseName: 'duo_capital_dev',
      identity: '127.0.0.1:27017/duo_capital_dev',
    })
  })

  it('accepte localhost sans port, sans identifiants, sans paramètres', () => {
    expect(parseMongoUri('mongodb://localhost/duo_capital_dev').hosts).toBe('localhost')
  })

  it('accepte plusieurs hôtes (replica set)', () => {
    expect(parseMongoUri('mongodb://a:27017,b:27017,c:27017/duo?replicaSet=rs0').hosts).toBe('a:27017,b:27017,c:27017')
  })

  it('refuse un port invalide', () => {
    expect(parseMongoUri('mongodb://localhost:99999/db')).toBeNull()
    expect(parseMongoUri('mongodb://localhost:abc/db')).toBeNull()
  })
})

describe('URI sans nom de base', () => {
  it.each([
    'mongodb://127.0.0.1:27017',
    'mongodb://127.0.0.1:27017/',
    'mongodb://127.0.0.1:27017/?replicaSet=rs0',
  ])('%s : valide mais nom de base vide', (uri) => {
    expect(parseMongoUri(uri).databaseName).toBe('')
  })
})

describe('URI mal formée', () => {
  it.each([
    ['', 'vide'],
    ['http://exemple.example.com/db', 'mongodb://'],
    ['cluster0.ab1cd.mongodb.net/db', 'mongodb://'],
    ['MongoDB+srv://u:p@cluster0.ab1cd.mongodb.net/db', 'minuscules'],
    ['"mongodb+srv://u:p@cluster0.ab1cd.mongodb.net/db"', 'guillemets'],
    ['mongodb://', 'hôte'],
    ['mongodb://u:p@/db', 'hôte'],
    ['mongodb://u:p@host/ma base', 'base'],
    ['mongodb://u:p@host/ma.base', 'base'],
    ['mongodb+srv://u:p@c.example.net/db?appName=A\nB', 'retour à la ligne'],
  ])('%s est refusée', (uri, reasonPart) => {
    expect(parseMongoUri(uri)).toBeNull()
    expect(explainMongoUriProblem(uri)).toContain(reasonPart)
  })

  it('refuse un espace réservé <password> laissé tel quel (copie depuis Atlas)', () => {
    expect(explainMongoUriProblem('mongodb+srv://duo_user:<password>@cluster0.ab1cd.mongodb.net/db')).toContain('<password>')
  })

  it('ne divulgue jamais les identifiants dans les raisons de rejet', () => {
    for (const uri of ['mongodb+srv://u:secret-fictif@@cluster0.ab1cd.mongodb.net/db', 'mongodb+srv://u:sec/ret-fictif@c.example.net/db', 'MongoDB://u:secret-fictif@h/db']) {
      expect(String(explainMongoUriProblem(uri))).not.toContain('secret-fictif')
    }
  })
})

describe('paramètres de requête', () => {
  it('ignore les paramètres pour le nom de base, même avec « / » ou « = »', () => {
    expect(parseMongoUri('mongodb://h/duo_dev?authSource=admin&appName=a/b&x=y=z').databaseName).toBe('duo_dev')
  })

  it('accepte des paramètres sans base (?…)', () => {
    expect(parseMongoUri('mongodb://h?replicaSet=rs0').databaseName).toBe('')
  })
})

describe('caractères spéciaux encodés dans les identifiants', () => {
  it('accepte @ / : ? # % encodés dans le mot de passe', () => {
    const uri = 'mongodb+srv://us%40er:p%40ss%2Fw%3Ard%3F%23%25@cluster0.ab1cd.mongodb.net/duo_capital_dev'
    expect(parseMongoUri(uri)).toMatchObject({ hosts: 'cluster0.ab1cd.mongodb.net', databaseName: 'duo_capital_dev' })
  })

  it('refuse un « @ » non encodé (au lieu de mal lire l’hôte)', () => {
    expect(explainMongoUriProblem('mongodb+srv://u:p@ss@cluster0.ab1cd.mongodb.net/db')).toContain('%40')
  })

  it('refuse un « / » non encodé (au lieu de mal lire le nom de base)', () => {
    expect(explainMongoUriProblem('mongodb+srv://u:p/ss@cluster0.ab1cd.mongodb.net/db')).toContain('%2F')
  })

  it('refuse un « : » ou un « % » mal encodé', () => {
    expect(explainMongoUriProblem('mongodb://u:p:ss@h/db')).toContain('%3A')
    expect(explainMongoUriProblem('mongodb://u:100%@h/db')).toContain('%25')
  })

  it('masque les identifiants encodés dans la version rédigée', () => {
    const redacted = redactMongoUri('mongodb+srv://us%40er:p%40ss%2Fw@cluster0.ab1cd.mongodb.net/db?retryWrites=true')
    expect(redacted).toBe('mongodb+srv://***@cluster0.ab1cd.mongodb.net/db?retryWrites=true')
  })

  it('masque aussi un mot de passe contenant un « @ » ou « / » non encodé', () => {
    expect(redactMongoUri('mongodb+srv://u:ab@cd@c.example.net/db')).not.toContain('cd')
    expect(redactMongoUri('mongodb+srv://u:ab/cd@c.example.net/db')).not.toContain('cd')
  })
})
