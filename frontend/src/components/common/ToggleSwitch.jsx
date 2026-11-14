/**
 * Interrupteur (activé / désactivé) avec libellé et explication.
 *
 * Props :
 * - id : identifiant du champ
 * - label : nom de la préférence
 * - description : phrase d'explication sous le libellé (optionnel)
 * - checked : état activé
 * - onChange : fonction (nouvelle valeur booléenne) appelée au changement
 * - disabled : désactive l'interrupteur (préférence pas encore disponible)
 */
function ToggleSwitch({ id, label, description, checked, onChange, disabled = false }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className={`block text-sm font-semibold ${disabled ? 'text-ink-soft' : 'text-ink'}`}>
          {label}
        </label>
        {description && <p className="mt-0.5 text-sm text-ink-soft">{description}</p>}
      </div>

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? 'bg-brand-600' : 'bg-line'
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-[#ffffff] shadow transition-all ${checked ? 'left-[1.375rem]' : 'left-0.5'}`}
        />
      </button>
    </div>
  )
}

export default ToggleSwitch
