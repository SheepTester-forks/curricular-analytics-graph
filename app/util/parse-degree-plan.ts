import { LinkedCourse } from '../App'
import {
  RequisiteType,
  VisualizationCourse,
  VisualizationCurriculum,
  toRequisiteType
} from '../types'
import { parseCsv } from './csv'

const quarters = ['FA', 'WI', 'SP'] as const

export type ParsedDegreePlan = {
  degreePlan: LinkedCourse[][]
  reqTypes: Record<string, RequisiteType>
}

export async function blobToDegreePlan (file: Blob): Promise<ParsedDegreePlan> {
  const coursesById: Record<string, LinkedCourse> = {}
  const degreePlan: LinkedCourse[][] = []
  const reqTypes: Record<string, RequisiteType> = {}
  let skipping: 'metadata' | 'header' | null = 'metadata'
  for await (const row of parseCsv(file.stream())) {
    if (skipping) {
      if (skipping === 'header') {
        skipping = null
      } else if (row[0] === 'Courses') {
        skipping = 'header'
      }
      continue
    }
    if (row[0] === 'Additional Courses') {
      skipping = 'header'
      continue
    }
    const [
      id,
      name,
      _prefix,
      _number,
      prereqs,
      coreqs,
      strictCoreqs,
      units,
      _institution,
      _canonicalName,
      term
    ] = row
    const courseData = {
      name,
      credits: +units,
      quarter: quarters[(+term - 1) % 3]
    }
    if (coursesById[id]) {
      Object.assign(coursesById[id], courseData)
    } else {
      coursesById[id] = { id: +id, ...courseData, backwards: [], forwards: [] }
    }
    degreePlan[+term - 1] ??= []
    degreePlan[+term - 1].push(coursesById[id])
    const reqsWithTypes: [string, RequisiteType][] = [
      [prereqs, 'prereq'],
      [coreqs, 'coreq'],
      [strictCoreqs, 'strict-coreq']
    ]
    for (const [reqs, type] of reqsWithTypes) {
      if (!reqs) {
        continue
      }
      for (const req of reqs.split(';')) {
        coursesById[req] ??= {
          id: +req,
          name: '',
          credits: 0,
          quarter: 'FA',
          backwards: [],
          forwards: []
        }
        coursesById[req].forwards.push(coursesById[id])
        coursesById[id].backwards.push(coursesById[req])
        reqTypes[`${req}->${id}`] = type
      }
    }
  }
  for (const term of degreePlan) {
    // Sort by outgoing nodes, then incoming
    term.sort(
      (a, b) =>
        b.forwards.length - a.forwards.length ||
        b.backwards.length - a.backwards.length
    )
  }
  return { degreePlan, reqTypes }
}

export function jsonToDegreePlan (
  plan: VisualizationCurriculum
): ParsedDegreePlan {
  const degreePlan = plan.curriculum_terms.map((term, i) =>
    term.curriculum_items.map((course): LinkedCourse & VisualizationCourse => ({
      ...course,
      quarter: quarters[i % 3],
      backwards: [],
      forwards: []
    }))
  )
  const courses = degreePlan.flat()
  const coursesById: Record<number, LinkedCourse> = {}
  for (const node of courses) {
    coursesById[node.id] ??= node
  }
  const reqTypes: Record<string, RequisiteType> = {}
  for (const course of courses) {
    for (const { source_id, type } of course.curriculum_requisites) {
      coursesById[source_id].forwards.push(course)
      course.backwards.push(coursesById[source_id])
      reqTypes[`${source_id}->${course.id}`] = toRequisiteType(type)
    }
  }
  for (const term of degreePlan) {
    // Sort by outgoing nodes, then incoming
    term.sort(
      (a, b) =>
        b.forwards.length - a.forwards.length ||
        b.backwards.length - a.backwards.length
    )
  }
  return { degreePlan, reqTypes }
}