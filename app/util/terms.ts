/**
 * Format: quarter code + last two digits of the year
 *
 * Quarters: FA, WI, SP, S1, S2
 * Example: FA21, S123
 */
export type Term = string

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
