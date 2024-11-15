import { memo } from 'react'
import { PrereqCache } from '../App'

const { compare } = new Intl.Collator('en-US', { numeric: true })

export type CourseDatalistProps = {
  id: string
  prereqCache: PrereqCache
}
export const CourseDatalist = memo(function CourseDatalist ({
  id,
  prereqCache
}: CourseDatalistProps) {
  const courseCodes = new Set(
    Object.values(prereqCache).flatMap(prereqs =>
      Object.entries(prereqs)
        .flatMap(([course, reqs]) => [course, ...reqs.flat()])
        .map(courseCode => courseCode.replace('*', ''))
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
