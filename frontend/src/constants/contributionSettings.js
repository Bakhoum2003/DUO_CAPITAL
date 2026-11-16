import { ASSOCIATES } from './associates'

export const MONTHLY_TARGET_PER_ASSOCIATE = 15000
export const MAX_CONTRIBUTION_AMOUNT = 10000000
export const MIN_CONTRIBUTION_DATE = '2020-01-01'
export const MAX_DESCRIPTION_LENGTH = 200

const AVATAR_TONES = ['green', 'red']

export const CONTRIBUTION_ASSOCIATES = ASSOCIATES.map((associate, index) => ({
  id: associate.value,
  name: associate.label,
  initials: associate.label
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase(),
  avatarTone: AVATAR_TONES[index % AVATAR_TONES.length],
}))

export const COLLECTIVE_MONTHLY_TARGET = MONTHLY_TARGET_PER_ASSOCIATE * CONTRIBUTION_ASSOCIATES.length

export const SORT_OPTIONS = [
  { value: 'date-desc', label: "Date : plus récentes d'abord" },
  { value: 'date-asc', label: "Date : plus anciennes d'abord" },
]
