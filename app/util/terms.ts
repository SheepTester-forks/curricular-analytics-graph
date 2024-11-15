import { LinkedCourse } from '../App'

/**
 * Format: quarter code + last two digits of the year
 *
 * Quarters: FA, WI, SP, S1, S2
 * Example: FA21, S123
 */
export type Term = string

/**
 * @see https://github.com/SheepTester-forks/ucsd-degree-plans/blob/main/metadata.json
 */
export type PrereqTermBounds = {
  min_prereq_term: Term
  max_prereq_term: Term
}

const quarters = ['WI', 'SP', 'SU', 'S1', 'S2', 'S3', 'FA']

/**
 * Computes `a - b`, though the magnitude of the number doesn't mean anything.
 *
 * @returns If negative, then a < b. If positive, a > b. If zero, a = b. Think
 * of it like subtracting b from both sides of the comparison.
 */
export function compareTerm (a: Term, b: Term): number {
  return (
    +a.slice(2) - +b.slice(2) ||
    quarters.indexOf(a.slice(0, 2)) - quarters.indexOf(b.slice(0, 2))
  )
}

export function getTerm (startYear: number, course: LinkedCourse): Term {
  return (
    course.quarter +
    String(
      (startYear + course.year + (course.quarter === 'FA' ? 0 : 1)) % 100
    ).padStart(2, '0')
  )
}

export function getTermClamped (
  startYear: number,
  course: LinkedCourse,
  { min_prereq_term, max_prereq_term }: PrereqTermBounds
): Term {
  const courseTerm = getTerm(startYear, course)
  return compareTerm(courseTerm, min_prereq_term) < 0
    ? min_prereq_term
    : compareTerm(courseTerm, max_prereq_term) > 0
      ? max_prereq_term
      : courseTerm
}
