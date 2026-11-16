import { PlusIcon } from '../../icons'
import ActionButton from './ActionButton'

function PageHeader({ title, description, addButtonLabel, onAddClick }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft sm:text-base">{description}</p>
      </div>

      {addButtonLabel && (
        <div className="shrink-0">
          <ActionButton label={addButtonLabel} icon={PlusIcon} onClick={onAddClick} />
        </div>
      )}
    </div>
  )
}

export default PageHeader
