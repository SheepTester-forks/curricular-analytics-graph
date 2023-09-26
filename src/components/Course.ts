import styles from '../styles.module.css'
import { RequisiteType, VisualizationCourse } from '../types'

export type CourseLink = {
  course: Course
  type: RequisiteType
}

export class Course {
  term: number
  index: number
  raw: VisualizationCourse

  forward: CourseLink[] = []
  backward: CourseLink[] = []

  wrapper: HTMLElement = Object.assign(document.createElement('div'), {
    className: styles.course
  })
  ball: HTMLElement = Object.assign(document.createElement('div'), {
    className: styles.courseBall
  })
  name: HTMLElement = Object.assign(document.createElement('div'), {
    className: styles.courseName
  })

  position = { x: 0, y: 0, radius: 0 }

  constructor (course: VisualizationCourse, term: number, index: number) {
    this.term = term
    this.index = index
    this.raw = course

    this.wrapper.append(this.ball, this.name)
  }

  measurePosition (): void {
    const { top, left, width, height } = this.ball.getBoundingClientRect()
    this.position = {
      x: left + width / 2,
      y: top + height / 2,
      radius: width / 2
    }
  }
}

export function longestPathFrom (
  start: Course,
  direction: 'backward' | 'forward'
): Course[] {
  const cache = new Map<Course, Course[] | null>()
  function iterate (course: Course): Course[] {
    const cached = cache.get(course)
    if (cached !== undefined) {
      if (cached === null) {
        throw new TypeError('Cycle.')
      }
      return cached
    }
    cache.set(course, null)
    const path = [
      course,
      ...course[direction]
        .map(link => iterate(link.course))
        .reduce((acc, curr) => (acc.length > curr.length ? acc : curr), [])
    ]
    cache.set(course, path)
    return path
  }
  return iterate(start)
}
