import PageHeader from '../common/PageHeader'

/**
 * En-tête de la page Cotisations : titre, description et bouton d'ajout
 * (s'appuie sur le composant commun PageHeader).
 *
 * Props :
 * - title : titre de la page
 * - description : phrase d'explication sous le titre
 * - addButtonLabel : texte du bouton d'ajout
 * - onAddClick : fonction appelée au clic sur le bouton (ouvre la fenêtre d'ajout)
 */
function ContributionsPageHeader({ title, description, addButtonLabel, onAddClick }) {
  return (
    <PageHeader title={title} description={description} addButtonLabel={addButtonLabel} onAddClick={onAddClick} />
  )
}

export default ContributionsPageHeader
