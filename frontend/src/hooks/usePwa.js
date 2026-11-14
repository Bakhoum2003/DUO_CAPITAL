import { useSyncExternalStore } from 'react'
import { pwaStore } from '../pwa/defaultPwaStore'

/** État PWA et actions : { ...état, notices, promptInstall, dismissInstall, applyUpdate, dismissUpdate }. */
export default function usePwa() {
  const state = useSyncExternalStore(pwaStore.subscribe, pwaStore.getState)
  return {
    ...state,
    promptInstall: pwaStore.promptInstall,
    dismissInstall: pwaStore.dismissInstall,
    applyUpdate: pwaStore.applyUpdate,
    dismissUpdate: pwaStore.dismissUpdate,
  }
}
