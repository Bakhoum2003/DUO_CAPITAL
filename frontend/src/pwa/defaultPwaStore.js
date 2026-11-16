import { createPwaStore } from './pwaStore'
import { unsavedChangesStore } from './defaultUnsavedChangesStore'

export const pwaStore = createPwaStore({ unsavedChanges: unsavedChangesStore })
