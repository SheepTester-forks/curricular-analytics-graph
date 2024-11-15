import { memo } from 'react'
import { Term } from '../util/terms'

const { compare } = new Intl.Collator('en-US', { numeric: true })

export type CourseDatalistProps = {
  id: string
  prereqCache: Record<Term, string[][]>
}
export const CourseDatalist = memo(function CourseDatalist ({
  id,
  prereqCache
}: CourseDatalistProps) {
  const courseCodes = new Set(
    Object.values(prereqCache).flatMap(prereqs =>
      Object.entries(prereqs).flatMap(([course, reqs]) => [
        course,
        ...reqs.flat()
      ])
    )
  )

  return (
    <datalist id={id}>
      {[...courseCodes].sort(compare).map(course => (
        <option key={course} value={course} />
      ))}
    </datalist>
  )
})
