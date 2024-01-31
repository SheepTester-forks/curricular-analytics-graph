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
}

export class DegreePlanParser {
  #parser = new CsvParser()
  #coursesById: Record<string, LinkedCourse> = {}
  #degreePlan: LinkedCourse[][] = []
  #reqTypes: Record<string, RequisiteType> = {}
  #skipping: 'metadata' | 'header' | null = 'metadata'

  #handleRow (row: string[]): void {
    if (this.#skipping) {
      if (this.#skipping === 'header') {
        this.#skipping = null
      } else if (row[0] === 'Courses') {
        this.#skipping = 'header'
      }
      return
    }
    if (row[0] === 'Additional Courses') {
      this.#skipping = 'header'
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
      term
    ] = row
    const courseData = {
      name,
      credits: +units,
      quarter: quarters[(+term - 1) % 3]
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
    this.#degreePlan[+term - 1] ??= []
    this.#degreePlan[+term - 1].push(this.#coursesById[id])
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
    for (const term of this.#degreePlan) {
      // Sort by outgoing nodes, then incoming
      term.sort(
        (a, b) =>
          b.forwards.length - a.forwards.length ||
          b.backwards.length - a.backwards.length
      )
    }
    return { degreePlan: this.#degreePlan, reqTypes: this.#reqTypes }
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
