/** Une rubrique est active sur sa propre adresse et sur ses sous-pages (même règle que NavLink). */
export function isRouteActive(pathname, to) {
  return pathname === to || pathname.startsWith(`${to}/`)
}

/**
 * Répartit les rubriques entre la barre du bas (rubriques principales, dans l'ordre demandé)
 * et le menu complet. Aucune rubrique n'est retirée : le menu les contient toutes.
 */
export function splitMobileNavigation(items, primaryRoutes) {
  const primary = primaryRoutes.map((to) => items.find((item) => item.to === to)).filter(Boolean)
  return { primary, secondary: items.filter((item) => !primary.includes(item)) }
}

/** Le bouton « Menu » est mis en évidence quand la page courante n'est pas dans la barre du bas. */
export function isMenuActive(pathname, primaryItems) {
  return !primaryItems.some((item) => isRouteActive(pathname, item.to))
}
