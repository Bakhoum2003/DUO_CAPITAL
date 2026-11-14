import { NavLink } from 'react-router-dom'

/**
 * Un lien de la barre latérale. Il est mis en évidence (vert vif) quand sa page est la page actuelle.
 *
 * Props :
 * - label : texte du lien
 * - to : chemin de destination
 * - icon : composant d'icône Font Awesome (voir src/icons)
 * - onNavigate : fonction appelée au clic (sert à fermer le menu mobile)
 */
function SidebarItem({ label, to, icon: Icon, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3.5 rounded-xl px-4 py-3 text-[0.95rem] font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 ${
          isActive ? 'bg-brand-500 text-white shadow-md shadow-black/10' : 'text-white/90 hover:bg-white/10'
        }`
      }
    >
      <Icon className="h-6 w-6 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  )
}

export default SidebarItem
