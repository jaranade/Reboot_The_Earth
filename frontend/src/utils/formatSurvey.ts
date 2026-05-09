import type { SurveyData } from '../components/FarmerSurvey'

function stripParens(s: string): string {
  return s.replace(/\s*\(.*?\)/g, '').trim().toLowerCase()
}

export function formatSurvey(d: SurveyData): string {
  const allCrops = [
    ...d.crops.map(stripParens),
    ...(d.cropsOther.trim() ? [d.cropsOther.trim().toLowerCase()] : []),
  ]

  const allStructures = [
    ...d.structures.filter((s) => s !== 'None').map((s) => s.toLowerCase()),
    ...(d.structuresOther.trim() ? [d.structuresOther.trim().toLowerCase()] : []),
  ]

  const lines: string[] = []

  lines.push('FARM PROFILE')
  lines.push(`Location: ${d.address}`)
  lines.push(`Coordinates: ${d.coordinates}`)
  lines.push(`Acres: ${d.acreage}`)
  lines.push('')

  lines.push('CROPS')
  lines.push(`Varieties: ${allCrops.join(', ')}`)
  lines.push(`Primary Growth Stage: ${d.growthStage.toLowerCase()}`)
  lines.push(`Harvest Within 2 Weeks: ${d.nearHarvest.toLowerCase()}`)
  lines.push('')

  lines.push('LIVESTOCK')
  lines.push(`Present: ${d.hasLivestock.toLowerCase()}`)
  if (d.hasLivestock === 'Yes') {
    lines.push(`Type: ${d.livestockType.toLowerCase()}`)
    lines.push(`Count: ${d.animalCount}`)
    lines.push(`Relocation Ready: ${d.relocationSite.toLowerCase()}`)
  }
  lines.push('')

  lines.push('WATER & IRRIGATION')
  lines.push(`Primary Source: ${d.irrigationSource.toLowerCase()}`)
  lines.push(`Defensive Irrigation Capable: ${d.defensiveIrrigation.toLowerCase()}`)
  lines.push('')

  lines.push('STRUCTURES')
  lines.push(`On-Site: ${allStructures.length ? allStructures.join(', ') : 'none'}`)
  lines.push('')

  lines.push('WORKFORCE')
  lines.push(`Workers Present: ${d.hasWorkers.toLowerCase()}`)
  if (d.hasWorkers === 'Yes') {
    lines.push(`Details: ${d.workerDetails}`)
  }

  return lines.join('\n')
}
