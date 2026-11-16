import { ClockRotateLeftIcon, PlusIcon, ReceiptIcon } from '../../icons'
import { OPERATION_TYPES } from '../../constants/businessSettings'
import { CARD_CLASSES } from '../../constants/uiClasses'
import ActionButton from '../common/ActionButton'
import EmptyState from '../common/EmptyState'
import SectionHeader from '../common/SectionHeader'
import OperationMobileItem from './OperationMobileItem'
import OperationTable from './OperationTable'
import OperationTypeFilter from './OperationTypeFilter'

const TYPE_FILTER_OPTIONS = [
  { value: '', label: 'Toutes' },
  ...Object.entries(OPERATION_TYPES).map(([value, type]) => ({ value, label: type.pluralLabel })),
]

function OperationsHistory({ operations, totalCount, typeFilter, onTypeFilterChange, onAdd, onEdit, onDelete }) {
  const badgeLabel = operations.length === totalCount ? `${totalCount} opération${totalCount > 1 ? 's' : ''}` : `${operations.length} sur ${totalCount}`

  return (
    <section className={CARD_CLASSES} aria-label="Historique des opérations financières">
      <SectionHeader icon={ClockRotateLeftIcon} title="Historique des opérations" badgeLabel={badgeLabel} />

      <div className="mb-4 flex flex-wrap gap-3">
        {Object.entries(OPERATION_TYPES).map(([type, typeStyle]) => (
          <ActionButton
            key={type}
            label={typeStyle.addLabel}
            icon={PlusIcon}
            variant={type === 'investment' ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => onAdd(type)}
          />
        ))}
      </div>

      {totalCount === 0 ? (
        <EmptyState
          icon={ReceiptIcon}
          title="Aucune opération enregistrée"
          description="Enregistrez un investissement, une dépense ou une recette pour suivre les performances de ce business."
        />
      ) : (
        <>
          <OperationTypeFilter value={typeFilter} options={TYPE_FILTER_OPTIONS} onChange={onTypeFilterChange} />

          {operations.length === 0 ? (
            <EmptyState
              icon={ReceiptIcon}
              title="Aucune opération de ce type"
              description="Choisissez un autre type, ou enregistrez une nouvelle opération."
            />
          ) : (
            <>
              <OperationTable operations={operations} onEdit={onEdit} onDelete={onDelete} />

              <ul className="space-y-3 md:hidden">
                {operations.map((operation) => (
                  <OperationMobileItem
                    key={operation.id}
                    type={operation.type}
                    amount={operation.amount}
                    date={operation.date}
                    associateName={operation.associate.name}
                    initials={operation.associate.initials}
                    avatarTone={operation.associate.avatarTone}
                    categoryLabel={operation.categoryLabel}
                    description={operation.description}
                    onEdit={() => onEdit(operation)}
                    onDelete={() => onDelete(operation)}
                  />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  )
}

export default OperationsHistory
