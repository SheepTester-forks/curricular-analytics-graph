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

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App, CourseStats } from './App'
import { csvStringToDegreePlan } from './util/parse-degree-plan'

//*
import dfwRatesByMajor from './data/fake-dfw-by-major.json'
import frequencies from './data/fake-frequency.json'
import waitlists from './data/fake-waitlist.json'
const equityGapsByMajor = { PHYS2CL: { allMajors: 'firstGen urm' } }
const realData = false
/*/
import dfwRatesByMajor from '../../curricular-analytics-exploration/files/protected/summarize_dfw_by_major.json'
import frequencies from '../../curricular-analytics-exploration/files/protected/summarize_frequency.json'
import waitlists from '../../curricular-analytics-exploration/files/protected/summarize_waitlist.json'
import equityGapsByMajor from '../../curricular-analytics-exploration/files/protected/summarize_equity_by_major.json'
const realData = true
//*/

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

type CourseDfwRates = {
  [majorSubject: string]: number | undefined
  allMajors: number
}

function getStats (courseName: string): CourseStats {
  const match = courseName.toUpperCase().match(/([A-Z]+) *(\d+[A-Z]*)/)
  const courseCode = match ? match[1] + match[2] : ''
  const dfwRates = (dfwRatesByMajor as Record<string, CourseDfwRates>)[
    courseCode
  ]
  const equityGaps = (
    equityGapsByMajor as Record<string, Record<string, string>>
  )[courseCode]
  return {
    dfw: dfwRates?.[majorSubject] ?? dfwRates?.allMajors ?? null,
    dfwForDepartment: dfwRates?.[majorSubject] !== undefined,
    equityGaps:
      equityGaps?.[majorSubject] !== undefined
        ? equityGaps[majorSubject]
          ? equityGaps[majorSubject].split(' ')
          : []
        : equityGaps?.allMajors
          ? equityGaps.allMajors.split(' ')
          : [],
    equityGapsForDepartment: equityGaps?.[majorSubject] !== undefined,
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
      realData={realData}
      year={+(params.get('year') ?? new Date().getFullYear())}
      isCurriculum={planType === 'curriculum'}
    />
  </StrictMode>
)
