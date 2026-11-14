const TONE_CLASSES = {
  success: 'bg-brand-100 text-brand-700',
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-danger-50 text-danger-600',
  neutral: 'bg-slate-100 text-slate-600',
}

/**
 * Petite pastille de statut (ex. « Terminé », « Payé »).
 *
 * Props :
 * - label : texte affiché
 * - tone : 'success', 'info', 'warning', 'danger' ou 'neutral' (gris)
 */
function StatusBadge({ label, tone = 'success' }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  )
}

export default StatusBadge
