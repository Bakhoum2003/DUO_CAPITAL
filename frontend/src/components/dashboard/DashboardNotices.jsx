import { CircleInfoIcon, TriangleExclamationIcon } from '../../icons'

/** Avertissements de fiabilité envoyés par le serveur (solde initial absent, résultat provisoire, etc.). */
function DashboardNotices({ notices }) {
  if (!notices?.length) return null
  return (
    <section aria-label="Informations sur les calculs" className="space-y-2">
      {notices.map((notice) => {
        const isWarning = notice.level === 'warning'
        const Icon = isWarning ? TriangleExclamationIcon : CircleInfoIcon
        return (
          <p
            key={notice.code}
            role={isWarning ? 'alert' : 'note'}
            className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${isWarning ? 'border-orange-100 bg-orange-50 text-ink' : 'border-blue-100 bg-blue-50 text-ink'}`}
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${isWarning ? 'text-orange-500' : 'text-blue-600'}`} aria-hidden="true" />
            {notice.message}
          </p>
        )
      })}
    </section>
  )
}

export default DashboardNotices
