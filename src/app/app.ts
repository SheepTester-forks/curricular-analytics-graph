import './app.css'
import { Graph } from '../index'
import example from './example.json'
import {
  RequisiteType,
  VisualizationCourse,
  VisualizationRequisite,
  VisualizationTerm,
  toRequisiteType
} from './types'
import styles from '../styles.module.css'

// TEMP: Contains sensitive info
import dfwRates from '../../../ExploratoryCurricularAnalytics/files/summarize_dfw.json'

const classes: Record<RequisiteType, string> = {
  prereq: styles.prereqs,
  coreq: styles.coreqs,
  'strict-coreq': styles.strictCoreqs
}

// https://curricularanalytics.org/degree_plans/11085
const graph = new Graph<
  VisualizationRequisite,
  VisualizationCourse,
  VisualizationTerm
>({
  termName: term => term.name,
  termSummary: term =>
    `Complexity: ${term.curriculum_items.reduce(
      (acc, curr) => acc + (curr.metrics.complexity ?? 0),
      0
    )}\nUnits: ${term.curriculum_items.reduce(
      (acc, curr) => acc + (curr.credits ?? 0),
      0
    )}`,
  courseName: ({ name, nameSub, nameCanonical }) =>
    name +
    (nameSub ? `\n${nameSub}` : '') +
    (nameCanonical ? `\n(${nameCanonical})` : ''),
  styleNode: (node, course) => {
    node.textContent = String(course.metrics.complexity ?? '')
    const dfw = (dfwRates as Record<string, number>)[
      course.name.replaceAll(' ', '')
    ]
    if (dfw && dfw > 0.1) {
      // node.style.borderColor = 'red'
    }
  },
  styleLink: (path, { type, source }) => {
    const dfw = (dfwRates as Record<string, number>)[
      source.name.replaceAll(' ', '')
    ]
    if (dfw) {
      // path.setAttributeNS(null, 'stroke', dfw > 0.1 ? 'red' : '')
    }
    path.classList.add(classes[toRequisiteType(type)])
  },
  styleLinkedNode: (node, _, link) => {
    if (link === null) {
      node.classList.remove(
        styles.selected,
        styles.directPrereq,
        styles.directCoreq,
        styles.directStrictCoreq,
        styles.directBlocking,
        styles.prereq,
        styles.blocking
      )
      return
    }
    node.classList.add(
      link.relation === 'selected'
        ? styles.selected
        : link.relation === 'forward'
        ? link.direct
          ? styles.directBlocking
          : styles.blocking
        : !link.direct
        ? styles.prereq
        : link.type === 'prereq'
        ? styles.directPrereq
        : link.type === 'coreq'
        ? styles.directCoreq
        : styles.directStrictCoreq
    )
  }
})
graph.setCurriculum(example)
graph.wrapper.classList.add('graph')
document.body.append(graph.wrapper)
