import { Router } from 'express'
import { createAuthenticate } from '../middlewares/authenticate.js'
import { createActivitiesRouter } from './activities.routes.js'
import { createContributionsRouter } from './contributions.routes.js'
import { createDashboardRouter } from './dashboard.routes.js'
import { createHistoryRouter } from './history.routes.js'
import { createSettingsRouter } from './settings.routes.js'
import { createStatisticsRouter } from './statistics.routes.js'
import { createTreasuryRouter } from './treasury.routes.js'
import { createUsersRouter } from './users.routes.js'
import { createWithdrawalsRouter } from './withdrawals.routes.js'

/**
 * Routeur de l'API versionnée (/api/v1).
 * Phase B3 : gestion des deux associés (/users). Phase C : dashboard financier (/dashboard). Phase D : cotisations (/contributions). Phase E : activités commerciales (/activities). Phase F : trésorerie commune en lecture seule (/treasury). Phase G : retraits des associés (/withdrawals). Phase Historique : opérations centralisées en lecture seule (/history). Phase Statistiques : indicateurs et graphiques en lecture seule (/statistics). Phase Paramètres : paramètres communs, préférences personnelles, rappels de cotisation et sécurité (/settings). Authentification obligatoire. Les modules métier (cotisations, business,
 * retraits, historique, trésorerie, statistiques, dashboard, paramètres) y seront montés dans les phases suivantes.
 * Les chemins inconnus restent en 404 (l'authentification n'est exigée que sous /users).
 *
 * @param {object} options
 * @param {object} options.config
 * @param {ReturnType<import('../services/user.service.js').createUserService>} options.userService
 * @param {ReturnType<import('../services/dashboard.service.js').createDashboardService>} options.dashboardService
 * @param {ReturnType<import('../services/contribution.service.js').createContributionService>} options.contributionService
 * @param {ReturnType<import('../services/activity.service.js').createActivityService>} options.activityService
 * @param {ReturnType<import('../services/treasury.service.js').createTreasuryService>} options.treasuryService
 * @param {ReturnType<import('../services/withdrawal.service.js').createWithdrawalService>} options.withdrawalService
 * @param {ReturnType<import('../services/history.service.js').createHistoryService>} options.historyService
 * @param {ReturnType<import('../services/statistics.service.js').createStatisticsService>} options.statisticsService
 * @param {ReturnType<import('../services/settings.service.js').createSettingsService>} options.settingsService
 */
export function createApiV1Router({ config, userService, dashboardService, contributionService, activityService, treasuryService, withdrawalService, historyService, statisticsService, settingsService }) {
  const router = Router()
  const authenticate = createAuthenticate({ config })

  router.use('/users', authenticate, createUsersRouter({ config, userService }))
  router.use('/dashboard', authenticate, createDashboardRouter({ dashboardService }))
  router.use('/contributions', authenticate, createContributionsRouter({ contributionService }))
  router.use('/activities', authenticate, createActivitiesRouter({ activityService }))
  router.use('/treasury', authenticate, createTreasuryRouter({ treasuryService }))
  router.use('/history', authenticate, createHistoryRouter({ historyService }))
  router.use('/statistics', authenticate, createStatisticsRouter({ statisticsService }))
  router.use('/settings', authenticate, createSettingsRouter({ settingsService }))
  router.use('/withdrawals', authenticate, createWithdrawalsRouter({ withdrawalService }))

  return router
}
