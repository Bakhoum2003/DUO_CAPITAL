import { apiClient } from '../services/apiClient'
import { authService } from '../services/authService'
import { createAuthStore } from './authStore'

// Instance unique utilisée par l'application ; le client HTTP la prévient quand la session est définitivement perdue.
export const authStore = createAuthStore({ authService })
apiClient.setSessionLostHandler(authStore.handleSessionLost)
