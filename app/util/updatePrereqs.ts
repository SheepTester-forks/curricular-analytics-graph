import { LinkedCourse, PrereqCache } from '../App'
import { RequisiteType } from '../types'
import { ParsedDegreePlan } from './parse-degree-plan'
import { getTermClamped, PrereqTermBounds } from './terms'

export function updatePrereqs (
  originalPlan: LinkedCourse[][],
  prereqCache: PrereqCache,
  startYear: number,
  bounds: PrereqTermBounds
): ParsedDegreePlan {
  const plan = originalPlan.map(term =>
    term.map(
      (course): LinkedCourse => ({ ...course, backwards: [], forwards: [] })
    )
  )
  const reqTypes: Record<string, RequisiteType> = {}

  const courseMap: Record<string, LinkedCourse> = {}
  for (const term of plan) {
    for (const course of term) {
      if (!courseMap[course.name]) {
        courseMap[course.name] = course
      }
    }
  }
  for (const term of plan) {
    for (const course of term) {
      const term = getTermClamped(startYear, course, bounds)
      for (const req of prereqCache[term]?.[course.name] ?? []) {
        for (const alt of req) {
          const reqCourse = courseMap[alt.replace('*', '')]
          if (!reqCourse) {
            continue
          }
          reqCourse.forwards.push(course)
          course.backwards.push(reqCourse)
          reqTypes[`${reqCourse.id}->${course.id}`] = alt.includes('*')
            ? 'coreq'
            : 'prereq'
          break
        }
      }
    }
  }

  return { degreePlan: plan, reqTypes }
}
