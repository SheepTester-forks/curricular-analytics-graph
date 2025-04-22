import { LinkedCourse, PrereqCache, RequisiteTypeMap } from '../App'
import { ParsedDegreePlan } from './parse-degree-plan'
import { getTermClamped, PrereqTermBounds } from './terms'

const courseCodeRegex = /\b([A-Z]+)\s*(\d+[A-Z]*)\b/

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
  const reqTypes: RequisiteTypeMap = {}
  const courseCodes = new Map<LinkedCourse, string>()

  const courseMap: Record<string, LinkedCourse> = {}
  for (const term of plan) {
    for (const course of term) {
      const match = course.name.toUpperCase().match(courseCodeRegex)
      if (!match) {
        continue
      }
      const courseCode = `${match[1]} ${match[2]}`
      courseCodes.set(course, courseCode)
      if (!courseMap[courseCode]) {
        courseMap[courseCode] = course
      }
    }
  }
  for (const term of plan) {
    for (const course of term) {
      const courseCode = courseCodes.get(course)
      if (!courseCode) {
        continue
      }
      const term = getTermClamped(startYear, course, bounds)
      for (const req of prereqCache[term]?.[courseCode] ?? []) {
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

  return { degreePlan: plan, reqTypes, planType: 'degree-plan' }
}
