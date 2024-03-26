import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App, CourseStats } from './App'
import { csvStringToDegreePlan } from './util/parse-degree-plan'

/*
import dfwRates from './data/fake-dfw.json'
import frequencies from './data/fake-frequency.json'
import waitlists from './data/fake-waitlist.json'
/*/
// Fuzzed files produced by scripts/fuzz-data.js
import dfwRates from './data/fuzzed-dfw.json'
import frequencies from '../../ExploratoryCurricularAnalytics/files/protected/summarize_frequency.json'
import waitlists from './data/fuzzed-waitlist.json'
//*/

// https://curricularanalytics.org/degree_plans/11085
// import example from './data/example.json'
// https://curricularanalytics.org/degree_plans/25144
import example from './data/SY-Degree Plan-Eighth-EC27.csv'
// https://curricularanalytics.org/degree_plans/25403
// import example from './data/EC27.json'

const { degreePlan, reqTypes } = csvStringToDegreePlan(
  window.location.hash.length > 1
    ? decodeURIComponent(window.location.hash.slice(1))
    : example
)
const params = new URL(window.location.href).searchParams

function getStats (courseName: string): CourseStats {
  const match = courseName.toUpperCase().match(/([A-Z]+) *(\d+[A-Z]*)/)
  return {
    dfw:
      (match && (dfwRates as Record<string, number>)[match[1] + match[2]]) ??
      null,
    frequency:
      (match &&
        (frequencies as Record<string, string[]>)[match[1] + match[2]]) ??
      null,
    waitlist:
      (match &&
        (waitlists as Record<string, number>)[match[1] + ' ' + match[2]]) ??
      null
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App
      initDegreePlan={degreePlan}
      initReqTypes={reqTypes}
      getStats={getStats}
      defaults={params.get('defaults') ?? ''}
      showOptions={!params.has('defaults')}
      realData={false}
    />
  </StrictMode>
)
