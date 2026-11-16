import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { API_BASE_PATH, API_V1_PATH, AUTH_PATH, HEALTH_PATH, JSON_BODY_LIMIT } from './config/constants.js'
import { createCorsOptions } from './config/cors.js'
import { createErrorHandler } from './middlewares/errorHandler.js'
import { notFound } from './middlewares/notFound.js'
import { createRateLimiter } from './middlewares/rateLimiter.js'
import { createRequestLogger } from './middlewares/requestLogger.js'
import { requireTrustedOrigin } from './middlewares/requireTrustedOrigin.js'
import { createHealthRouter } from './routes/health.routes.js'
import { createAuthRouter } from './routes/auth.routes.js'
import { createApiV1Router } from './routes/index.js'
import { createServerlessEntry } from './serverless.js'
import { createAuthService } from './services/auth.service.js'
import { createActivityService } from './services/activity.service.js'
import { createTreasuryService } from './services/treasury.service.js'
import { createContributionService } from './services/contribution.service.js'
import { createDashboardService } from './services/dashboard.service.js'
import { createHistoryService } from './services/history.service.js'
import { createSettingsService } from './services/settings.service.js'
import { createStatisticsService } from './services/statistics.service.js'
import { createUserService } from './services/user.service.js'
import { createWithdrawalService } from './services/withdrawal.service.js'

/**
 * Construit l'application Express. Elle ne lit aucune variable d'environnement et n'ouvre aucune connexion :
 * tout lui est fourni, ce qui permet de la tester sans MongoDB et de créer plusieurs instances.
 *
 * @param {object} options
 * @param {object} options.config configuration validée (voir config/env.js)
 * @param {import('pino').Logger} options.logger
 * @param {{ checkHealth: Function }} options.database accès à l'état de la base
 * @param {() => Date} [options.clock] horloge (tests) ; l'heure réelle par défaut
 */
export function createApp({ config, logger, database, clock }) {
  const app = express()

  app.disable('x-powered-by')
  // Derrière un proxy (Vercel), req.ip vient de X-Forwarded-For : lu seulement si le nombre de proxys de confiance est configuré.
  if (config.trustProxy > 0) app.set('trust proxy', config.trustProxy)
  app.use(createRequestLogger(logger))
  app.use(helmet())
  app.use(cors(createCorsOptions(config.frontendOrigins)))

  app.use(HEALTH_PATH, createHealthRouter({ config, database }))

  app.use(API_BASE_PATH, createRateLimiter(config.rateLimit))
  app.use(API_BASE_PATH, requireTrustedOrigin(config.frontendOrigins))
  app.use(express.json({ limit: JSON_BODY_LIMIT }))

  app.use(AUTH_PATH, createAuthRouter({ config, authService: createAuthService({ config, logger }) }))

  const dashboardService = createDashboardService({ config, clock })
  const treasuryService = createTreasuryService({ clock }) // une seule garde de trésorerie, partagée par tous les modules de sortie
  app.use(
    API_V1_PATH,
    createApiV1Router({
      config,
      userService: createUserService(),
      dashboardService,
      contributionService: createContributionService({ config, clock }),
      activityService: createActivityService({ clock }),
      treasuryService,
      withdrawalService: createWithdrawalService({ treasuryService, clock }),
      historyService: createHistoryService({ treasuryService, dashboardService }),
      statisticsService: createStatisticsService({ treasuryService, config }),
      settingsService: createSettingsService({ config, clock }),
    }),
  )

  app.use(notFound)
  app.use(createErrorHandler({ logger, config }))

  return app
}

/**
 * Point d'entrée des hébergements serverless (Vercel détecte `src/app.js` et exige un export par défaut) :
 * une application Express légère qui, à la première requête seulement, lit la configuration, ouvre MongoDB
 * (une fois, connexion réutilisée) et construit l'application complète avec `createApp`.
 * L'import de ce module ne lit aucune variable d'environnement et n'ouvre aucune connexion.
 * Le démarrage local passe toujours par `src/server.js`.
 */
export default createServerlessEntry({ createApp })
