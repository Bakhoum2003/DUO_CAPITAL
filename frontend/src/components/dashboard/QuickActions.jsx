import { BoltIcon } from '../../icons'
import { Link } from 'react-router-dom'
import { CARD_CLASSES } from '../../constants/uiClasses'
import { TONE_STYLES } from '../../constants/toneStyles'
import SectionHeader from '../common/SectionHeader'

function QuickActions({ actions }) {
  return (
    <section className={CARD_CLASSES} aria-label="Actions rapides">
      <SectionHeader icon={BoltIcon} iconClassName="text-orange-500" title="Actions Rapides" />

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {actions.map((action) => {
          const styles = TONE_STYLES[action.tone]
          const ActionIcon = action.icon

          return (
            <li key={action.id}>
              <Link
                to={action.to}
                className={`flex h-full flex-col items-center justify-center gap-2 rounded-xl border px-1 py-4 text-center transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/30 ${styles.surface} ${styles.border}`}
              >
                <ActionIcon className={`h-7 w-7 ${styles.icon}`} aria-hidden="true" />
                <span className={`whitespace-pre-line text-sm font-semibold leading-snug ${styles.icon}`}>
                  {action.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default QuickActions
