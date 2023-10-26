import styles from '../styles.module.css'

export type CourseLink<C, R> = {
  course: Course<C, R>
  raw: R
}

export class Course<C, R> {
  static #id = 0
  /** Guaranteed to be nonzero. */
  id: number

  term: number
  index: number
  raw: C

  forward: CourseLink<C, R>[] = []
  backward: CourseLink<C, R>[] = []

  wrapper: HTMLElement = Object.assign(document.createElement('div'), {
    className: styles.course
  })
  ball: HTMLElement = Object.assign(document.createElement('button'), {
    className: styles.courseBall
  })
  name: HTMLElement = Object.assign(document.createElement('div'), {
    className: styles.courseName
  })

  position = { x: 0, y: 0, radius: 0 }

  constructor (course: C, term: number, index: number) {
    this.id = ++Course.#id
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

  #reachable (): Set<Course<C, R>> {
    const reachable = new Set<Course<C, R>>([this])
    const toVisit: Course<C, R>[] = [this]
    let next: Course<C, R> | undefined
    while ((next = toVisit.pop())) {
      for (const { course } of next.forward) {
        if (!reachable.has(course)) {
          reachable.add(course)
          toVisit.push(course)
        }
      }
    }
    return reachable
  }

  #blockingFactor (): number {
    return this.#reachable().size
  }

  #delayFactor (paths: Course<C, R>[][]): number {
    // assign DF to courses
    for (const path of paths) {
      //
    }
    return 0
  }

  /** Gets all paths in a graph. */
  static allPaths<C, R> (courses: Course<C, R>[]): Course<C, R>[][] {
    const paths: Course<C, R>[][] = []
    for (const sink of courses) {
      // Only consider sink nodes
      if (sink.backward.length === 0 || sink.forward.length > 0) {
        continue
      }

      const toVisit: Course<C, R>[][] = [[sink]]
      let path: Course<C, R>[] | undefined
      while ((path = toVisit.pop())) {
        for (const [i, { course }] of path[0].backward.entries()) {
          if (i === 0) {
            // First neighbor, build onto existing path
            path.unshift(course)
          } else {
            path = [...path]
            path[0] = course
          }
          // If reached a source, then the path is done
          if (course.backward.length === 0) {
            paths.push(path)
          } else {
            toVisit.push(path)
          }
        }
      }
    }
    return paths
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
