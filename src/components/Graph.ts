import { Course, longestPathFrom } from './Course'
import styles from '../styles.module.css'
import { Link, LinkHandler, LinkRenderer } from './LinkRenderer'
import { Join } from '../util/Join'

export interface ICurriculum<T> {
  curriculum_terms: T[]
}

export interface ITerm<C> {
  curriculum_items: C[]
}

export interface ICourse<R> {
  id: number
  curriculum_requisites: R[]
}

export type IRequisite = {
  source_id: number
  target_id: number
}

type GridItem<C, R> =
  | { type: 'course'; course: Course<C, R> }
  | { type: 'term-header'; index: number; content: string }
  | { type: 'term-footer'; index: number; content: string }

export type GraphOptions<R, C, T> = {
  /** Shown at the top of each term column. */
  termName: (term: T, index: number) => string
  /** Shown at the bottom of each term column. */
  termSummary: (term: T, index: number) => string
  /** Shown under each course node. */
  courseName: (course: C) => string
  /** Shown in each course node. */
  courseValue: (course: C) => string
  /** Handle styling for a link. */
  styleLink: LinkHandler<C, R>
  /**  */
  styleLinkedNode: (element: HTMLElement, link: R, course: C) => void
}

export class Graph<
  R extends IRequisite,
  C extends ICourse<R>,
  T extends ITerm<C>
> extends Join<GridItem<C, R>, HTMLElement> {
  #courseNodes = new WeakMap<Element, Course<C, R>>()
  #highlighted: Course<C, R>[] = []

  #links: Link<C, R>[] = []
  #allLinks: LinkRenderer<C, R>
  #linksHighlighted: LinkRenderer<C, R>
  #longestPath: SVGPathElement

  #maxTermLength: number = 0
  #options: Omit<GraphOptions<R, C, T>, 'styleLink'>

  constructor ({
    termName = (_, i) => `Term ${i + 1}`,
    termSummary = () => '',
    courseName = () => '',
    courseValue = () => '',
    styleLink = () => {},
    styleLinkedNode = () => {}
  }: Partial<GraphOptions<R, C, T>> = {}) {
    super({
      wrapper: Object.assign(document.createElement('div'), {
        className: styles.graph
      }),
      key: item =>
        item.type === 'course'
          ? `course\0${item.course.name}`
          : `${item.type}\0${item.index}`,
      enter: item => {
        if (item.type === 'course') {
          return item.course.wrapper
        } else if (item.type === 'term-header') {
          const header = Object.assign(document.createElement('div'), {
            className: styles.termHeading,
            role: 'columnheader',
            id: `term-heading-${item.index}`
          })
          header.style.gridColumn = `${item.index + 1} / ${item.index + 2}`
          return header
        } else if (item.type === 'term-footer') {
          const footer = Object.assign(document.createElement('div'), {
            className: styles.termFooter
          })
          footer.style.gridColumn = `${item.index + 1} / ${item.index + 2}`
          footer.setAttribute('aria-describedby', `term-heading-${item.index}`)
          return footer
        } else {
          throw new TypeError(`${item['type']}??`)
        }
      },
      update: (item, element) => {
        if (item.type === 'course') {
          const course = item.course
          course.name.title = course.name.textContent =
            this.#options.courseName(item.course.raw)
          course.ball.textContent = this.#options.courseValue(item.course.raw)
          element.style.gridColumn = `${course.term + 1} / ${course.term + 2}`
          element.setAttribute(
            'aria-describedby',
            `term-heading-${course.index}`
          )
        } else if (item.type === 'term-header') {
          element.textContent = item.content
        } else if (item.type === 'term-footer') {
          element.textContent = item.content
          element.style.gridRow = `${this.#maxTermLength + 2}`
        }
      },
      measure: item => {
        if (item.type === 'course') {
          item.course.measurePosition()
        }
      }
    })

    this.#options = {
      termName,
      termSummary,
      courseName,
      courseValue,
      styleLinkedNode
    }

    this.wrapper.addEventListener('pointerover', this.#handlePointerOver)
    this.wrapper.addEventListener('pointerout', this.#handlePointerOut)

    this.#allLinks = new LinkRenderer(styleLink)
    this.#allLinks.wrapper.classList.add(styles.allLinks)
    this.#linksHighlighted = new LinkRenderer(styleLink)
    this.#linksHighlighted.wrapper.classList.add(styles.highlightedLinks)

    this.#longestPath = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path'
    )
    this.#longestPath.setAttributeNS(null, 'class', styles.longestPath)
    this.#linksHighlighted.wrapper.append(this.#longestPath)
    this.wrapper.append(this.#allLinks.wrapper, this.#linksHighlighted.wrapper)

    new ResizeObserver(([{ contentBoxSize }]) => {
      const [{ blockSize, inlineSize }] = contentBoxSize
      this.#handleResize(inlineSize, blockSize)
    }).observe(this.wrapper)
  }

  #dfs (course: Course<C, R>, direction: 'backward' | 'forward'): void {
    this.#highlighted.push(course)
    course.wrapper.classList.add(
      styles.highlighted,
      direction === 'backward' ? styles.prereq : styles.blocking
    )
    for (const { course: neighbor } of course[direction]) {
      this.#dfs(neighbor, direction)
    }
  }

  #handleHoverCourse (course: Course<C, R> | null) {
    for (const course of this.#highlighted) {
      course.wrapper.classList.remove(
        styles.highlighted,
        styles.selected,
        styles.directPrereq,
        styles.directCoreq,
        styles.directStrictCoreq,
        styles.directBlocking,
        styles.prereq,
        styles.blocking
      )
    }
    if (!course) {
      this.wrapper.classList.remove(styles.courseSelected)
      this.#highlighted = []
      this.#linksHighlighted.join([])
      return
    }
    this.wrapper.classList.add(styles.courseSelected)
    course.wrapper.classList.add(styles.highlighted, styles.selected)
    this.#highlighted = [course]
    for (const link of course.backward) {
      link.course.wrapper.classList.add(styles.highlighted)
      this.#options.styleLinkedNode(link.course.wrapper, link.raw, course.raw)
      this.#dfs(link.course, 'backward')
    }
    for (const link of course.forward) {
      link.course.wrapper.classList.add(styles.highlighted)
      this.#options.styleLinkedNode(link.course.wrapper, link.raw, course.raw)
      this.#dfs(link.course, 'forward')
    }
    this.#linksHighlighted.join(
      this.#links.filter(
        ({ source, target }) =>
          this.#highlighted.includes(source) &&
          this.#highlighted.includes(target)
      )
    )
    try {
      const longestPath = [
        ...longestPathFrom(course, 'backward').reverse(),
        ...longestPathFrom(course, 'forward').slice(1)
      ]
      this.#longestPath.setAttributeNS(
        null,
        'd',
        longestPath
          .slice(0, -1)
          .map((course, i) => LinkRenderer.linkPath(course, longestPath[i + 1]))
          .join('')
      )
    } catch {
      this.#longestPath.setAttributeNS(null, 'd', '')
    }
  }

  #handlePointerOver = (e: PointerEvent): void => {
    if (!(e.target instanceof HTMLElement)) {
      return
    }
    const courseNode = e.target.closest(`.${styles.courseBall}`)
    if (!courseNode) {
      return
    }
    const course = this.#courseNodes.get(courseNode)
    if (!course) {
      return
    }
    this.#handleHoverCourse(course)
  }

  #handlePointerOut = (e: PointerEvent): void => {
    if (!(e.target instanceof HTMLElement)) {
      return
    }
    const courseNode = e.target.closest(`.${styles.courseBall}`)
    if (courseNode) {
      this.#handleHoverCourse(null)
    }
  }

  #handleResize (width: number, height: number) {
    // Before editing the DOM, measure all the node positions
    this.measure()

    this.#allLinks.forceUpdate()
    this.#allLinks.setSize(width, height)
    this.#linksHighlighted.forceUpdate()
    this.#linksHighlighted.setSize(width, height)
  }

  setCurriculum (curriculum: ICurriculum<T>): void {
    // https://stackoverflow.com/a/61240964
    this.#maxTermLength = curriculum.curriculum_terms.reduce(
      (acc, curr) => Math.max(acc, curr.curriculum_items.length),
      0
    )

    this.wrapper.style.gridTemplateColumns = `repeat(${curriculum.curriculum_terms.length}, minmax(0, 1fr))`
    this.wrapper.style.gridTemplateRows = `40px repeat(${
      this.#maxTermLength
    }, minmax(0, 1fr)) 60px`

    const courses: Course<C, R>[] = []
    const coursesById: Record<number, Course<C, R>> = {}
    const items: GridItem<C, R>[] = []
    for (const [i, term] of curriculum.curriculum_terms.entries()) {
      items.push({
        type: 'term-header',
        index: i,
        content: this.#options.termName(term, i)
      })

      for (const [j, item] of term.curriculum_items.entries()) {
        const course = new Course<C, R>(item, i, j)
        items.push({ type: 'course', course })
        this.#courseNodes.set(course.ball, course)
        courses.push(course)

        coursesById[course.raw.id] ??= course
      }

      items.push({
        type: 'term-footer',
        index: i,
        content: this.#options.termSummary(term, i)
      })
    }

    this.#links = []
    for (const target of courses) {
      for (const requisite of target.raw.curriculum_requisites) {
        const source = coursesById[requisite.source_id]
        this.#links.push({
          source,
          target,
          raw: requisite
        })
        source.forward.push({ course: target, raw: requisite })
        target.backward.push({ course: source, raw: requisite })
      }
    }

    this.join(items)
    this.#allLinks.join(this.#links)
  }
}
