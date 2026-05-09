export type RiskLevel = 'low' | 'moderate' | 'high' | 'extreme'

export interface DayRisk {
  date: string
  fwi: number
  level: RiskLevel
}

export interface Action {
  priority: number
  action: string
  deadline: string
  rationale: string
  driver: string
}

export interface MockResponse {
  farm: { name: string; crop: string; size: string }
  risk_timeline: DayRisk[]
  actions: Action[]
}

export const mockResponses: Record<string, MockResponse> = {
  almond: {
    farm: { name: 'Sierra Vista Ranch', crop: 'Almonds', size: 'Medium (200 acres)' },
    risk_timeline: [
      { date: 'Mon', fwi: 22, level: 'low' },
      { date: 'Tue', fwi: 38, level: 'moderate' },
      { date: 'Wed', fwi: 52, level: 'high' },
      { date: 'Thu', fwi: 71, level: 'extreme' },
      { date: 'Fri', fwi: 65, level: 'extreme' },
      { date: 'Sat', fwi: 44, level: 'high' },
      { date: 'Sun', fwi: 29, level: 'moderate' },
    ],
    actions: [
      { priority: 1, action: 'Begin early harvest of north block', deadline: 'Wednesday', rationale: 'Thursday forecasts 35 mph winds with 8% humidity — shaker equipment creates ignition risk.', driver: 'Wind forecast' },
      { priority: 2, action: 'Stage water trailer at field perimeter', deadline: 'Tuesday EOD', rationale: 'Extreme FWI Thursday–Friday means suppression resources will be overwhelmed. On-site water gives first 20 minutes.', driver: 'FWI threshold ≥ 70' },
      { priority: 3, action: 'Coordinate with adjacent landowners on controlled burn window', deadline: 'Monday', rationale: 'Any planned burns must be completed before Wednesday weather window closes.', driver: 'Burn permit calendar' },
      { priority: 4, action: 'Inspect and clear debris from irrigation ditches', deadline: 'Wednesday', rationale: 'Dry ditch debris is primary fire pathway in almond orchards during Santa Ana conditions.', driver: 'Historical fire pathway data' },
    ],
  },
  cattle: {
    farm: { name: 'Gavilan Hills Cattle Co.', crop: 'Cattle', size: 'Large (1,800 acres)' },
    risk_timeline: [
      { date: 'Mon', fwi: 18, level: 'low' },
      { date: 'Tue', fwi: 34, level: 'moderate' },
      { date: 'Wed', fwi: 49, level: 'moderate' },
      { date: 'Thu', fwi: 68, level: 'extreme' },
      { date: 'Fri', fwi: 72, level: 'extreme' },
      { date: 'Sat', fwi: 55, level: 'high' },
      { date: 'Sun', fwi: 31, level: 'moderate' },
    ],
    actions: [
      { priority: 1, action: 'Move cattle from eastern pasture to main corrals', deadline: 'Wednesday noon', rationale: 'Eastern pasture is upwind of the predicted fire spread corridor for Thursday extreme conditions.', driver: 'Spread model output' },
      { priority: 2, action: 'Activate mutual aid trailer-sharing agreement', deadline: 'Tuesday', rationale: 'If evacuation is ordered Thursday, you need 4 additional trailers. Neighbors need 48-hour notice.', driver: 'Livestock transport capacity' },
      { priority: 3, action: 'Mow firebreaks along south fence line', deadline: 'Tuesday EOD', rationale: 'Dry grass along south fence is 18" tall — well above the 6" threshold for rapid spread.', driver: 'Fuel moisture readings' },
      { priority: 4, action: 'Pre-position livestock medications and records', deadline: 'Wednesday', rationale: 'In past evacuations, delays in retrieving vet records created costly quarantine issues.', driver: 'Emergency protocol' },
    ],
  },
  vineyard: {
    farm: { name: 'Temecula Valley Estates', crop: 'Wine Grapes', size: 'Small (85 acres)' },
    risk_timeline: [
      { date: 'Mon', fwi: 25, level: 'low' },
      { date: 'Tue', fwi: 41, level: 'moderate' },
      { date: 'Wed', fwi: 57, level: 'high' },
      { date: 'Thu', fwi: 74, level: 'extreme' },
      { date: 'Fri', fwi: 69, level: 'extreme' },
      { date: 'Sat', fwi: 48, level: 'high' },
      { date: 'Sun', fwi: 33, level: 'moderate' },
    ],
    actions: [
      { priority: 1, action: 'Harvest Chardonnay blocks now — do not wait for optimal Brix', deadline: 'Tuesday', rationale: 'Smoke taint from Thursday fire risk will devalue fruit more than picking 2 days early. Insurance requires documented decision.', driver: 'Smoke taint risk model' },
      { priority: 2, action: 'Shut off drip irrigation by Wednesday night', deadline: 'Wednesday night', rationale: 'Wet soil increases humidity near ground but dry canopy is the real risk — overhead irrigation would help more but is not available.', driver: 'Relative humidity forecast' },
      { priority: 3, action: 'Back up tasting room reservation system offsite', deadline: 'Tuesday', rationale: 'Server is on-premises. Two prior Temecula fires resulted in total data loss for similar operations.', driver: 'Business continuity' },
      { priority: 4, action: 'Clear 30-ft buffer around barrel storage building', deadline: 'Wednesday', rationale: '$2.4M in aged wine stored there. Current clearance is 12 ft — well below defensible space standard.', driver: 'Defensible space audit' },
    ],
  },
}
