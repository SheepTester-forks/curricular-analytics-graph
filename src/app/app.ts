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
    )}`,
  courseName: ({ name, nameSub, nameCanonical }) =>
    name +
    (nameSub ? `\n${nameSub}` : '') +
    (nameCanonical ? `\n(${nameCanonical})` : ''),
  courseValue: course => String(course.metrics.complexity ?? ''),
  styleLink: (path, { type }) => {
    path.classList.add(classes[toRequisiteType(type)])
  },
  styleLinkedNode: (node, { type }) => {
    node.classList.add(
      type === 'prereq'
        ? styles.directPrereq
        : type === 'coreq'
        ? styles.directCoreq
        : styles.directStrictCoreq
    )
  }
})
graph.setCurriculum(example)
graph.wrapper.classList.add('graph')
document.body.append(graph.wrapper)
