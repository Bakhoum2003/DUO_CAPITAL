import { config } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowDown,
  faArrowLeft,
  faArrowRight,
  faArrowRotateLeft,
  faArrowTrendDown,
  faArrowTrendUp,
  faArrowUp,
  faArrowsRotate,
  faAward,
  faBars,
  faBell,
  faBolt,
  faBookOpen,
  faBottleWater,
  faBoxArchive,
  faBriefcase,
  faBuilding,
  faBuildingColumns,
  faBullseye,
  faCalculator,
  faCalendarDays,
  faCartShopping,
  faChartColumn,
  faChartLine,
  faChartPie,
  faCheck,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faCircleArrowDown,
  faCircleArrowUp,
  faCircleCheck,
  faCircleExclamation,
  faCircleInfo,
  faCircleNotch,
  faCirclePause,
  faCirclePlay,
  faClock,
  faClockRotateLeft,
  faCoins,
  faDownload,
  faCookieBite,
  faEnvelope,
  faEye,
  faEyeSlash,
  faFileLines,
  faFlag,
  faFloppyDisk,
  faGaugeHigh,
  faGear,
  faHandHoldingDollar,
  faHashtag,
  faLayerGroup,
  faLock,
  faMagnifyingGlass,
  faMoneyBillTransfer,
  faMoneyBillWave,
  faPause,
  faPen,
  faPercent,
  faPersonDigging,
  faPiggyBank,
  faPlugCircleXmark,
  faPlay,
  faPlus,
  faReceipt,
  faRightFromBracket,
  faRightToBracket,
  faRocket,
  faRotateLeft,
  faScaleBalanced,
  faShieldHalved,
  faShirt,
  faSliders,
  faStore,
  faTag,
  faTags,
  faTrash,
  faTriangleExclamation,
  faTrophy,
  faUser,
  faUsers,
  faUtensils,
  faWallet,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'

// Icônes de DUO CAPITAL : exclusivement Font Awesome Free (style Solid).
// Le CSS de Font Awesome n'est pas injecté automatiquement : les quelques règles utiles sont dans styles/index.css
// (couche « base »), afin que les classes Tailwind de taille (h-4 w-4…) restent prioritaires.
config.autoAddCss = false

/**
 * Fabrique un composant d'icône : <WalletIcon className="h-4 w-4" aria-hidden="true" />.
 * L'icône hérite de la couleur du texte (currentColor), donc du thème clair comme du thème sombre.
 * Une icône seule dans un bouton doit être accompagnée d'un aria-label sur le bouton.
 */
function createIcon(definition, displayName) {
  function AppIcon({ className, ...props }) {
    return <FontAwesomeIcon icon={definition} className={className} {...props} />
  }
  AppIcon.displayName = displayName
  return AppIcon
}

export const ArrowDownIcon = createIcon(faArrowDown, 'ArrowDownIcon')
export const ArrowLeftIcon = createIcon(faArrowLeft, 'ArrowLeftIcon')
export const ArrowRightIcon = createIcon(faArrowRight, 'ArrowRightIcon')
export const ArrowRotateLeftIcon = createIcon(faArrowRotateLeft, 'ArrowRotateLeftIcon')
export const ArrowTrendDownIcon = createIcon(faArrowTrendDown, 'ArrowTrendDownIcon')
export const ArrowTrendUpIcon = createIcon(faArrowTrendUp, 'ArrowTrendUpIcon')
export const ArrowUpIcon = createIcon(faArrowUp, 'ArrowUpIcon')
export const ArrowsRotateIcon = createIcon(faArrowsRotate, 'ArrowsRotateIcon')
export const AwardIcon = createIcon(faAward, 'AwardIcon')
export const BarsIcon = createIcon(faBars, 'BarsIcon')
export const BellIcon = createIcon(faBell, 'BellIcon')
export const BoltIcon = createIcon(faBolt, 'BoltIcon')
export const BookOpenIcon = createIcon(faBookOpen, 'BookOpenIcon')
export const BottleWaterIcon = createIcon(faBottleWater, 'BottleWaterIcon')
export const BoxArchiveIcon = createIcon(faBoxArchive, 'BoxArchiveIcon')
export const BriefcaseIcon = createIcon(faBriefcase, 'BriefcaseIcon')
export const BuildingIcon = createIcon(faBuilding, 'BuildingIcon')
export const BuildingColumnsIcon = createIcon(faBuildingColumns, 'BuildingColumnsIcon')
export const BullseyeIcon = createIcon(faBullseye, 'BullseyeIcon')
export const CalculatorIcon = createIcon(faCalculator, 'CalculatorIcon')
export const CalendarDaysIcon = createIcon(faCalendarDays, 'CalendarDaysIcon')
export const CartShoppingIcon = createIcon(faCartShopping, 'CartShoppingIcon')
export const ChartColumnIcon = createIcon(faChartColumn, 'ChartColumnIcon')
export const ChartLineIcon = createIcon(faChartLine, 'ChartLineIcon')
export const ChartPieIcon = createIcon(faChartPie, 'ChartPieIcon')
export const CheckIcon = createIcon(faCheck, 'CheckIcon')
export const ChevronDownIcon = createIcon(faChevronDown, 'ChevronDownIcon')
export const ChevronLeftIcon = createIcon(faChevronLeft, 'ChevronLeftIcon')
export const ChevronRightIcon = createIcon(faChevronRight, 'ChevronRightIcon')
export const CircleArrowDownIcon = createIcon(faCircleArrowDown, 'CircleArrowDownIcon')
export const CircleArrowUpIcon = createIcon(faCircleArrowUp, 'CircleArrowUpIcon')
export const CircleCheckIcon = createIcon(faCircleCheck, 'CircleCheckIcon')
export const CircleExclamationIcon = createIcon(faCircleExclamation, 'CircleExclamationIcon')
export const CircleInfoIcon = createIcon(faCircleInfo, 'CircleInfoIcon')
export const CircleNotchIcon = createIcon(faCircleNotch, 'CircleNotchIcon')
export const CirclePauseIcon = createIcon(faCirclePause, 'CirclePauseIcon')
export const CirclePlayIcon = createIcon(faCirclePlay, 'CirclePlayIcon')
export const ClockIcon = createIcon(faClock, 'ClockIcon')
export const ClockRotateLeftIcon = createIcon(faClockRotateLeft, 'ClockRotateLeftIcon')
export const CoinsIcon = createIcon(faCoins, 'CoinsIcon')
export const CookieBiteIcon = createIcon(faCookieBite, 'CookieBiteIcon')
export const DownloadIcon = createIcon(faDownload, 'DownloadIcon')
export const EnvelopeIcon = createIcon(faEnvelope, 'EnvelopeIcon')
export const EyeIcon = createIcon(faEye, 'EyeIcon')
export const EyeSlashIcon = createIcon(faEyeSlash, 'EyeSlashIcon')
export const FileLinesIcon = createIcon(faFileLines, 'FileLinesIcon')
export const FlagIcon = createIcon(faFlag, 'FlagIcon')
export const FloppyDiskIcon = createIcon(faFloppyDisk, 'FloppyDiskIcon')
export const GaugeHighIcon = createIcon(faGaugeHigh, 'GaugeHighIcon')
export const GearIcon = createIcon(faGear, 'GearIcon')
export const HandHoldingDollarIcon = createIcon(faHandHoldingDollar, 'HandHoldingDollarIcon')
export const HashtagIcon = createIcon(faHashtag, 'HashtagIcon')
export const LayerGroupIcon = createIcon(faLayerGroup, 'LayerGroupIcon')
export const LockIcon = createIcon(faLock, 'LockIcon')
export const MagnifyingGlassIcon = createIcon(faMagnifyingGlass, 'MagnifyingGlassIcon')
export const MoneyBillTransferIcon = createIcon(faMoneyBillTransfer, 'MoneyBillTransferIcon')
export const MoneyBillWaveIcon = createIcon(faMoneyBillWave, 'MoneyBillWaveIcon')
export const PauseIcon = createIcon(faPause, 'PauseIcon')
export const PenIcon = createIcon(faPen, 'PenIcon')
export const PercentIcon = createIcon(faPercent, 'PercentIcon')
export const PersonDiggingIcon = createIcon(faPersonDigging, 'PersonDiggingIcon')
export const PiggyBankIcon = createIcon(faPiggyBank, 'PiggyBankIcon')
export const PlayIcon = createIcon(faPlay, 'PlayIcon')
export const PlugCircleXmarkIcon = createIcon(faPlugCircleXmark, 'PlugCircleXmarkIcon')
export const PlusIcon = createIcon(faPlus, 'PlusIcon')
export const ReceiptIcon = createIcon(faReceipt, 'ReceiptIcon')
export const RightFromBracketIcon = createIcon(faRightFromBracket, 'RightFromBracketIcon')
export const RightToBracketIcon = createIcon(faRightToBracket, 'RightToBracketIcon')
export const RocketIcon = createIcon(faRocket, 'RocketIcon')
export const RotateLeftIcon = createIcon(faRotateLeft, 'RotateLeftIcon')
export const ScaleBalancedIcon = createIcon(faScaleBalanced, 'ScaleBalancedIcon')
export const ShieldHalvedIcon = createIcon(faShieldHalved, 'ShieldHalvedIcon')
export const ShirtIcon = createIcon(faShirt, 'ShirtIcon')
export const SlidersIcon = createIcon(faSliders, 'SlidersIcon')
export const StoreIcon = createIcon(faStore, 'StoreIcon')
export const TagIcon = createIcon(faTag, 'TagIcon')
export const TagsIcon = createIcon(faTags, 'TagsIcon')
export const TrashIcon = createIcon(faTrash, 'TrashIcon')
export const TriangleExclamationIcon = createIcon(faTriangleExclamation, 'TriangleExclamationIcon')
export const TrophyIcon = createIcon(faTrophy, 'TrophyIcon')
export const UserIcon = createIcon(faUser, 'UserIcon')
export const UsersIcon = createIcon(faUsers, 'UsersIcon')
export const UtensilsIcon = createIcon(faUtensils, 'UtensilsIcon')
export const WalletIcon = createIcon(faWallet, 'WalletIcon')
export const XmarkIcon = createIcon(faXmark, 'XmarkIcon')
