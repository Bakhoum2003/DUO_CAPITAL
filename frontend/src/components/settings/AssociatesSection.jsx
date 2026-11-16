import { UsersIcon } from '../../icons'
import AssociateInfoCard from './AssociateInfoCard'
import SettingsSection from './SettingsSection'

function AssociatesSection({ associates, roleLabel, participationPercent, monthlyTarget, errorMessages }) {
  return (
    <SettingsSection
      icon={UsersIcon}
      title="Associés"
      badgeLabel="Lecture seule"
      description="DUO CAPITAL compte deux associés, avec la même participation et le même objectif."
      contentElement={
        <>
          {errorMessages.length > 0 && (
            <ul role="alert" className="mb-3 list-disc rounded-xl bg-danger-50 py-3 pl-8 pr-4 text-sm text-danger-600">
              {errorMessages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {associates.map((associate) => (
              <AssociateInfoCard
                key={associate.id}
                name={associate.name}
                initials={associate.initials}
                avatarTone={associate.avatarTone}
                roleLabel={roleLabel}
                participationPercent={participationPercent}
                monthlyTarget={monthlyTarget}
              />
            ))}
          </div>
        </>
      }
    />
  )
}

export default AssociatesSection
