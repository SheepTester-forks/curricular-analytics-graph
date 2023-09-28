import styles from '../styles.module.css'

export type CourseLink<C, R> = {
  course: Course<C, R>
  raw: R
}

export class Course<C, R> {
  term: number
  index: number
  raw: C

  forward: CourseLink<C, R>[] = []
  backward: CourseLink<C, R>[] = []

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

  constructor (course: C, term: number, index: number) {
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

export function longestPathFrom<C, R> (
  start: Course<C, R>,
  direction: 'backward' | 'forward'
): Course<C, R>[] {
  const cache = new Map<Course<C, R>, Course<C, R>[] | null>()
  function iterate (course: Course<C, R>): Course<C, R>[] {
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
