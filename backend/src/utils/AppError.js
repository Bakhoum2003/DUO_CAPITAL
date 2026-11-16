export class AppError extends Error {
  /**
   * @param {object} options
   * @param {number} [options.status] statut HTTP (500 par défaut)
   * @param {string} [options.code] code d'erreur stable, en MAJUSCULES_AVEC_TIRETS_BAS
   * @param {string} [options.message] message affichable (français)
   * @param {Array<{field: string, message: string}>} [options.fields] erreurs par champ (validation)
   * @param {Error} [options.cause] erreur d'origine (journalisée, jamais renvoyée au client)
   */
  constructor({ status = 500, code = 'INTERNAL_SERVER_ERROR', message = 'Une erreur est survenue.', fields, cause } = {}) {
    super(message, cause ? { cause } : undefined)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.fields = fields
    this.isOperational = true
  }
}
