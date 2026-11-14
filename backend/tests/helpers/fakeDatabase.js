/**
 * Base de données factice (sans MongoDB) pour tester Express et le démarrage du serveur.
 * `events` garde l'ordre des appels (connect, disconnect…), utile pour vérifier le cycle de vie.
 */
export function createFakeDatabase({ health = { status: 'connected', transactions: true }, connectError = null } = {}) {
  const events = []
  return {
    events,
    health,
    async connect() {
      events.push('connect')
      if (connectError) throw connectError
    },
    async disconnect() {
      events.push('disconnect')
    },
    async checkHealth() {
      return this.health
    },
  }
}
