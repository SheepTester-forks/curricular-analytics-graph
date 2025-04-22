import { LinkedCourse, RequisiteTypeMap } from '../App'
import {
  RequisiteType,
  VisualizationCourse,
  VisualizationCurriculum,
  toRequisiteType
} from '../types'
import { CsvParser } from './csv'

const quarters = ['FA', 'WI', 'SP'] as const

export type ParsedDegreePlan = {
  name?: string
  degreePlan: LinkedCourse[][]
  reqTypes: RequisiteTypeMap
  planType: 'degree-plan' | 'curriculum'
}

type CsvCourse = LinkedCourse & {
  /**
   * Used solely to sort courses when converting curriculum to degree plan
   * https://github.com/CurricularAnalytics/CurricularAnalytics.jl/blob/88bfa3cb7a09b9707862bae185003dfd6ecb6b83/src/DegreePlanCreation.jl#L18
   */
  number: string
}

export class DegreePlanParser {
  #parser = new CsvParser()
  #coursesById: Record<number, CsvCourse> = {}
  #degreePlan: CsvCourse[][] = []
  #reqTypes: RequisiteTypeMap = {}
  #skipping: 'metadata' | 'courses-header' | null = 'metadata'
  #parsingCurriculum = true
  #name: string | undefined = undefined

  #handleRow (row: string[]): void {
    if (this.#skipping) {
      if (this.#skipping === 'courses-header') {
        this.#skipping = null
      } else if (row[0] === 'Courses') {
        this.#skipping = 'courses-header'
      } else if (row[0] === 'Degree Plan') {
        this.#parsingCurriculum = false
      }
      if (row[0] === (this.#parsingCurriculum ? 'Curriculum' : 'Degree Plan')) {
        this.#name = row[1]
      }
      return
    }
    if (row[0] === 'Additional Courses') {
      this.#skipping = 'courses-header'
      return
    }
    const [
      idStr,
      name,
      _prefix,
      number,
      prereqs,
      coreqs,
      strictCoreqs,
      units,
      _institution,
      _canonicalName,
      term = '1'
    ] = row
    const id = +idStr
    const courseData = {
      name,
      number,
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
        const reqId = +req
        this.#coursesById[reqId] ??= {
          id: reqId,
          name: '',
          number: '',
          credits: 0,
          year: 0,
          quarter: 'FA',
          backwards: [],
          forwards: []
        }
        this.#coursesById[reqId].forwards.push(this.#coursesById[id])
        this.#coursesById[id].backwards.push(this.#coursesById[reqId])
        this.#reqTypes[`${reqId}->${id}`] = type
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
      this.#degreePlan = curriculumToDegreePlan(
        this.#degreePlan[0],
        this.#reqTypes
      )
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
      name: this.#name,
      degreePlan: this.#degreePlan,
      reqTypes: this.#reqTypes,
      planType: this.#parsingCurriculum ? 'curriculum' : 'degree-plan'
    }
  }
}

function curriculumToDegreePlan (
  courses: CsvCourse[],
  reqTypes: RequisiteTypeMap
): CsvCourse[][] {
  // https://github.com/CurricularAnalytics/CurricularVisualization.jl/blob/master/src/CurricularVisualization.jl#L162
  // https://www.desmos.com/calculator/sms3k0yh3y
  // NOTE: These units are intended for semester systems
  const maxUnitsPerTerm = Math.min(
    15 + Math.ceil((courses.length + 8) / 40) * 3,
    6 + Math.ceil(courses.length / 8) * 3
  )
  // https://github.com/CurricularAnalytics/CurricularAnalytics.jl/blob/88bfa3cb7a09b9707862bae185003dfd6ecb6b83/src/DegreePlanCreation.jl#L14
  courses.sort((a, b) =>
    (a.number || a.name).localeCompare(b.number || b.name, [], {
      numeric: true
    })
  )
  let termCourses: CsvCourse[] = []
  let termUnits = 0
  const terms = [termCourses]
  while (courses.length > 0) {
    let course: CsvCourse | null = null
    courses: for (const target of courses) {
      // Ensure none of the other courses in `termCourses` are its prereq
      for (const course of termCourses) {
        if (reqTypes[`${course.id}->${target.id}`] === 'prereq') {
          continue courses
        }
      }
      // Ensure none of the remaining `courses` are a prereq
      for (const source of courses) {
        if (source !== target && isReachable(source, target)) {
          continue courses
        }
      }
      course = target
      break
    }
    if (!course) {
      // Can't find a course to add, so create new term
      if (termCourses.length > 0) {
        termCourses = []
        terms.push(termCourses)
        termUnits = 0
      }
      continue
    }
    if (termUnits + course.credits <= maxUnitsPerTerm) {
      termCourses.push(course)
    } else {
      termCourses = [course]
      terms.push(termCourses)
      termUnits = 0
    }
    termUnits += course.credits
    // Add strict coreqs
    for (const coreq of courses) {
      if (
        coreq !== course &&
        coreq.backwards.some(
          req => reqTypes[`${req.id}->${course.id}`] === 'strict-coreq'
        )
      ) {
        termCourses.push(coreq)
        termUnits += coreq.credits
      }
    }
    courses = courses.filter(course => !termCourses.includes(course))
  }
  return terms
}

function isReachable (source: LinkedCourse, target: LinkedCourse): boolean {
  if (source === target) {
    return true
  }
  for (const neighbor of source.forwards) {
    if (isReachable(neighbor, target)) {
      return true
    }
  }
  return false
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
  const reqTypes: RequisiteTypeMap = {}
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
