/**
 * URL parameter documentation
 *
 * - `major`: The first two characters are used to look up major-specific DFW
 *   rates in `dfwRatesByMajor`.
 * - `defaults`: Either `ca` (for Curricular Analytics, which should match their
 *   original visualization) or `ucsd` (Carlos' preferred defaults).
 * - `hide-panel`: Whether to hide the side panel.
 * - `title`: A title to show at the top of the side panel.
 *
 * The URL fragment is used to store the degree plan to render.
 */

declare const VERSION: string

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App, CourseStats } from './App'
import { csvStringToDegreePlan } from './util/parse-degree-plan'

// these are probably not protected data
import waitlists from '../../curricular-analytics-exploration/files/protected/summarize_waitlist.json'
import frequencies from '../../curricular-analytics-exploration/files/protected/summarize_frequency.json'

type CourseDfwRates = {
  [majorSubject: string]: number | undefined
  allMajors: number
}

const protectedData = VERSION !== 'public'
let dfwRatesByMajor: Record<string, CourseDfwRates>
let equityGapsByMajor: Record<string, Record<string, string>> = {}
let transferEquityGap: Record<string, Record<string, boolean>> = {}
let majorToDept: Record<string, string> = {}
if (protectedData) {
  dfwRatesByMajor = (
    await import(
      '../../curricular-analytics-exploration/files/protected/summarize_dfw_by_major.json'
    )
  ).default
  equityGapsByMajor = (
    await import(
      '../../curricular-analytics-exploration/files/protected/summarize_equity_by_major.json'
    )
  ).default
  transferEquityGap = (
    await import(
      '../../curricular-analytics-exploration/files/protected/summarize_transfer_gap.json'
    )
  ).default
  majorToDept = (
    await import(
      '../../curricular-analytics-exploration/files/protected/summarize_major_to_dept.json'
    )
  ).default
  // TODO: removed allMajor from equity gaps
} else {
  dfwRatesByMajor = (
    await import(
      '../../curricular-analytics-exploration/files/summarize_dfw_public.json'
    )
  ).default
}

// https://curricularanalytics.org/degree_plans/11085
// import example from './data/example.json'
// https://curricularanalytics.org/degree_plans/25144
import example from './data/SY-Degree Plan-Eighth-EC27.csv'
// https://curricularanalytics.org/degree_plans/25403
// import example from './data/EC27.json'

const params = new URL(window.location.href).searchParams
const sourceUrl = params.get('from')
const { name, degreePlan, reqTypes, planType } = csvStringToDegreePlan(
  window.location.hash.length > 1
    ? decodeURIComponent(window.location.hash.slice(1))
    : sourceUrl
      ? await fetch(
        new URL(
          sourceUrl,
          'https://raw.githubusercontent.com/SheepTester-forks/ucsd-degree-plans/main/'
        )
      )
        .then(r =>
          r.ok
            ? r.text()
            : Promise.reject(new Error(`HTTP ${r.status} error: ${r.url}`))
        )
        .catch(error => {
          alert(
            `There was an issue loading the selected plan.\n\n${
              error.stack ?? error.message ?? error
            }`
          )
          console.error(error)
          return example
        })
      : example
)
const majorSubject = params.get('major')?.slice(0, 2) ?? ''
const department = majorToDept[majorSubject] ?? ''

function getStats (courseName: string): CourseStats {
  const match = courseName.toUpperCase().match(/([A-Z]+) *(\d+[A-Z]*)/)
  const courseCode = match ? match[1] + match[2] : ''
  const dfwRates = dfwRatesByMajor[courseCode]
  const transferGaps = transferEquityGap[courseCode] ?? {}
  const equityGaps = equityGapsByMajor[courseCode] ?? {}
  return {
    dfw: dfwRates?.[department] ?? dfwRates?.allMajors ?? null,
    dfwForDepartment: dfwRates?.[department] !== undefined,
    equityGaps: [
      ...(equityGaps[department] !== undefined
        ? equityGaps[department]
          ? equityGaps[department].split(' ')
          : []
        : equityGaps.allMajors // TODO: I believe i got rid of this
          ? equityGaps.allMajors.split(' ')
          : []),
      ...((
        transferGaps[department] !== undefined
          ? transferGaps[department]
          : transferGaps.allMajors
      )
        ? ['transfer']
        : []) // TODO: indicate whether transfer gap comes from dept or not
    ],
    equityGapsForDepartment: equityGaps?.[department] !== undefined,
    frequency: (frequencies as Record<string, string[]>)[courseCode] ?? null,
    waitlist: (waitlists as Record<string, number>)[courseCode] ?? null
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App
      initDegreePlan={degreePlan}
      initReqTypes={reqTypes}
      getStats={getStats}
      defaults={params.get('defaults') ?? ''}
      panelMode={
        params.has('hide-panel')
          ? {}
          : {
            title: params.get('title') ?? name ?? undefined,
            key: true,
            options: true,
            majorDfwNote: majorSubject !== ''
          }
      }
      protectedData={protectedData}
      year={+(params.get('year') ?? new Date().getFullYear())}
      isCurriculum={planType === 'curriculum'}
    />
  </StrictMode>
)
