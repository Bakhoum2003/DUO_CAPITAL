import { contributionsMockData } from '../data/contributionsMockData'

export async function getContributions() {
  return contributionsMockData.map((contribution) => ({ ...contribution }))
}
