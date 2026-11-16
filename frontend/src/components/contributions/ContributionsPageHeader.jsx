import PageHeader from '../common/PageHeader'

function ContributionsPageHeader({ title, description, addButtonLabel, onAddClick }) {
  return (
    <PageHeader title={title} description={description} addButtonLabel={addButtonLabel} onAddClick={onAddClick} />
  )
}

export default ContributionsPageHeader
