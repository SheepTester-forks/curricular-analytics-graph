import { LinkedCourse } from '../App'
import {
  RequisiteType,
  VisualizationCourse,
  VisualizationCurriculum,
  toRequisiteType
} from '../types'
import { CsvParser } from './csv'

const quarters = ['FA', 'WI', 'SP'] as const

export type ParsedDegreePlan = {
  degreePlan: LinkedCourse[][]
  reqTypes: Record<string, RequisiteType>
  planType: 'degree-plan' | 'curriculum'
}

export class DegreePlanParser {
  #parser = new CsvParser()
  #coursesById: Record<string, LinkedCourse> = {}
  #degreePlan: LinkedCourse[][] = []
  #reqTypes: Record<string, RequisiteType> = {}
  #skipping: 'metadata' | 'courses-header' | null = 'metadata'
  #parsingCurriculum = true

  #handleRow (row: string[]): void {
    if (this.#skipping) {
      if (this.#skipping === 'courses-header') {
        this.#skipping = null
      } else if (row[0] === 'Courses') {
        this.#skipping = 'courses-header'
      } else if (row[0] === 'Degree Plan') {
        this.#parsingCurriculum = false
      }
      return
    }
    if (row[0] === 'Additional Courses') {
      this.#skipping = 'courses-header'
      return
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
      term = '1'
    ] = row
    const courseData = {
      name,
      credits: +units,
      year: this.#parsingCurriculum ? 0 : Math.floor((+term - 1) / 3),
      quarter: this.#parsingCurriculum ? 'FA' : quarters[(+term - 1) % 3]
    }
    if (this.#coursesById[id]) {
      Object.assign(this.#coursesById[id], courseData)
    } else {
      this.#coursesById[id] = {
        id: +id,
        ...courseData,
        backwards: [],
        forwards: []
      }
    }
    const termIndex = this.#parsingCurriculum ? 0 : +term - 1
    this.#degreePlan[termIndex] ??= []
    this.#degreePlan[termIndex].push(this.#coursesById[id])
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
        this.#coursesById[req] ??= {
          id: +req,
          name: '',
          credits: 0,
          year: 0,
          quarter: 'FA',
          backwards: [],
          forwards: []
        }
        this.#coursesById[req].forwards.push(this.#coursesById[id])
        this.#coursesById[id].backwards.push(this.#coursesById[req])
        this.#reqTypes[`${req}->${id}`] = type
      }
    }
  }

  accept (chunk: string): void {
    for (const row of this.#parser.accept(chunk)) {
      this.#handleRow(row)
    }
  }

  finish (): ParsedDegreePlan {
    for (const row of this.#parser.finish()) {
      this.#handleRow(row)
    }
    if (this.#parsingCurriculum) {
      // TODO: use https://github.com/CurricularAnalytics/CurricularVisualization.jl/blob/master/src/CurricularVisualization.jl#L162
      const courses = new Set(this.#degreePlan[0])
      // Put all solo courses at end
      this.#degreePlan[0] = this.#degreePlan[0].filter(
        course => course.forwards.length === 0 && course.backwards.length === 0
      )
      for (const prereqLessCourse of this.#degreePlan[0]) {
        courses.delete(prereqLessCourse)
      }
      // Go term by term, adding courses that are satisfied
      const satisfied = new Set<LinkedCourse>()
      while (courses.size > 0) {
        const newTerm: LinkedCourse[] = []
        for (const course of courses) {
          if (course.backwards.every(prereq => satisfied.has(prereq))) {
            newTerm.push(course)
            courses.delete(course)
          }
        }
        this.#degreePlan.splice(-1, 0, newTerm)
        for (const course of newTerm) {
          satisfied.add(course)
        }
      }
    }
    for (const term of this.#degreePlan) {
      // Sort by outgoing nodes, then incoming
      term.sort(
        (a, b) =>
          b.forwards.length - a.forwards.length ||
          b.backwards.length - a.backwards.length
      )
    }
    return {
      degreePlan: this.#degreePlan,
      reqTypes: this.#reqTypes,
      planType: this.#parsingCurriculum ? 'curriculum' : 'degree-plan'
    }
  }
}

export function csvStringToDegreePlan (csv: string): ParsedDegreePlan {
  const parser = new DegreePlanParser()
  parser.accept(csv)
  return parser.finish()
}

export async function csvBlobToDegreePlan (
  file: Blob
): Promise<ParsedDegreePlan> {
  const reader = file.stream().pipeThrough(new TextDecoderStream()).getReader()
  const parser = new DegreePlanParser()
  let result
  while (!(result = await reader.read()).done) {
    const { value } = result
    parser.accept(value)
  }
  return parser.finish()
}

export function jsonToDegreePlan (
  plan: VisualizationCurriculum
): ParsedDegreePlan {
  const degreePlan = plan.curriculum_terms.map((term, i) =>
    term.curriculum_items.map((course): LinkedCourse & VisualizationCourse => ({
      ...course,
      year: Math.floor(i / 3),
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
  return { degreePlan, reqTypes, planType: 'degree-plan' }
}
