import { CARD_CLASSES } from '../../constants/uiClasses'

/**
 * Carte d'une section des Paramètres : icône, titre, explication et contenu.
 *
 * Props :
 * - icon : composant d'icône Font Awesome (voir src/icons)
 * - title : titre de la section
 * - description : phrase d'explication (optionnel)
 * - badgeLabel : petite pastille à droite du titre, ex. « Lecture seule » (optionnel)
 * - contentElement : élément React affiché dans la carte (formulaire, liste de lignes…)
 */
function SettingsSection({ icon: Icon, title, description, badgeLabel, contentElement }) {
  return (
    <section className={CARD_CLASSES} aria-label={title}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-3">
          <Icon className="h-6 w-6 shrink-0 text-brand-600" aria-hidden="true" />
          <h2 className="text-lg font-bold leading-snug text-ink">{title}</h2>
        </div>
        {badgeLabel && (
          <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-ink-soft">{badgeLabel}</span>
        )}
      </div>
      {description && <p className="mt-2 text-sm text-ink-soft">{description}</p>}
      <div className="mt-4">{contentElement}</div>
    </section>
  )
}

export default SettingsSection
