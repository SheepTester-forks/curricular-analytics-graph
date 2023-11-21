import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App, CourseStats, LinkedCourse } from './App'
import { RequisiteType, VisualizationCourse, toRequisiteType } from './types'

import dfwRates from './data/fake-dfw.json'
import frequencies from './data/fake-frequency.json'
import waitlists from './data/fake-waitlist.json'
// import dfwRates from '../../ExploratoryCurricularAnalytics/files/protected/summarize_dfw.json'
// import frequencies from '../../ExploratoryCurricularAnalytics/files/protected/summarize_frequency.json'
// import waitlists from '../../ExploratoryCurricularAnalytics/files/protected/summarize_waitlist.json'

// https://curricularanalytics.org/degree_plans/11085
// import example from './data/example.json'
// https://curricularanalytics.org/degree_plans/25144
import example from './data/BE27.json'
// https://curricularanalytics.org/degree_plans/25403
// import example from './data/EC27.json'

const nodesByTerm = example.curriculum_terms.map(term =>
  term.curriculum_items.map((course): LinkedCourse & VisualizationCourse => ({
    ...course,
    backwards: [],
    forwards: []
  }))
)
const nodes = nodesByTerm.flat()
const nodesById: Record<number, LinkedCourse> = {}
for (const node of nodes) {
  nodesById[node.id] ??= node
}
const reqTypes: Record<string, RequisiteType> = {}
for (const node of nodes) {
  for (const { source_id, type } of node.curriculum_requisites) {
    nodesById[source_id].forwards.push(node)
    node.backwards.push(nodesById[source_id])
    reqTypes[`${source_id}->${node.id}`] = toRequisiteType(type)
  }
}
for (const term of nodesByTerm) {
  // Sort by outgoing nodes, then incoming
  term.sort(
    (a, b) =>
      b.forwards.length - a.forwards.length ||
      b.backwards.length - a.backwards.length
  )
}

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
      degreePlan={nodesByTerm}
      reqTypes={reqTypes}
      getStats={getStats}
      realData={dfwRates['MATH18'] < 0.001}
    />
  </StrictMode>
)
