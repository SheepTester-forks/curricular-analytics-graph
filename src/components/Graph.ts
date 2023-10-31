import { Course, longestPathFrom } from './Course'
import styles from '../styles.module.css'
import { Link, LinkHandler, LinkRenderer } from './LinkRenderer'
import { Join } from '../util/Join'
import { Tooltip, TooltipOptions } from './Tooltip'

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

type GridItem<C, R, T> =
  | { type: 'course'; course: Course<C, R> }
  | { type: 'term-header'; index: number; term: T }
  | { type: 'term-footer'; index: number; term: T }

export type GraphOptions<R, C, T> = TooltipOptions<C, R> & {
  /** Shown at the top of each term column. */
  termName: (term: T, index: number) => string
  /** Shown at the bottom of each term column. */
  termSummary: (term: T, index: number) => string
  /** Shown under each course node. */
  courseName: (course: C) => string
  /** Apply styles to a node. */
  styleNode: (element: HTMLElement, course: C) => void
  /** Apply styles to a link. */
  styleLink: LinkHandler<C, R>
  /**
   * Apply styles to a node that is highlighted when a course is selected.
   *
   * @param link - If `link === null`, then the course was highlighted and needs
   * its styles to be removed. Otherwise, if `link.relation` is:
   * - `selected`: `course` is the selected course.
   * - `backward`/`forward`: `course` is in the prerequisite (`backward`) or
   *   blocking `forward` field of the selected course. `direct` means whether
   *   `course` is directly linked to the selected course.
   */
  styleLinkedNode: (
    element: HTMLElement,
    course: C,
    link:
      | (R & { relation: 'backward' | 'forward'; direct: boolean })
      | { relation: 'selected' }
      | null
  ) => void
}

export class Graph<
  R extends IRequisite,
  C extends ICourse<R>,
  T extends ITerm<C>
> extends Join<GridItem<C, R, T>, HTMLElement> {
  #courseNodes = new WeakMap<Element, Course<C, R>>()
  #highlighted: Course<C, R>[] = []
  #selected: Course<C, R> | null = null

  #links: Link<C, R>[] = []
  #allLinks: LinkRenderer<C, R>
  #linksHighlighted: LinkRenderer<C, R>
  #longestPath: Course<C, R>[] = []
  #longestPathElement: SVGPathElement

  #tooltip: Tooltip<C, R>

  #maxTermLength: number = 0
  options: Partial<GraphOptions<R, C, T>>

  constructor (options: Partial<GraphOptions<R, C, T>> = {}) {
    super({
      wrapper: Object.assign(document.createElement('div'), {
        className: styles.graph
      }),
      key: item =>
        item.type === 'course'
          ? `course\0${item.course.id}`
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
            this.options.courseName?.(item.course.raw) ?? ''
          this.options.styleNode?.(course.ball, item.course.raw)
          element.style.gridColumn = `${course.term + 1} / ${course.term + 2}`
          element.setAttribute(
            'aria-describedby',
            `term-heading-${course.index}`
          )
        } else if (item.type === 'term-header') {
          element.textContent =
            this.options.termName?.(item.term, item.index) ??
            `Term ${item.index + 1}`
        } else if (item.type === 'term-footer') {
          element.textContent =
            this.options.termSummary?.(item.term, item.index) ?? ''
          element.style.gridRow = `${this.#maxTermLength + 2}`
        }
      },
      measure: item => {
        if (item.type === 'course') {
          item.course.measurePosition()
        }
      }
    })

    this.options = options
    this.#tooltip = new Tooltip<C, R>({
      tooltipTitle: (...args) => options.tooltipTitle?.(...args) ?? '',
      tooltipContent: (...args) => options.tooltipContent?.(...args) ?? [],
      tooltipRequisiteInfo: (...args) => options.tooltipRequisiteInfo?.(...args)
    })

    this.wrapper.addEventListener('pointerover', this.#handlePointerOver)
    this.wrapper.addEventListener('pointerout', this.#handlePointerOut)
    this.wrapper.addEventListener('click', this.#handleClick)

    this.#allLinks = new LinkRenderer((...args) => options.styleLink?.(...args))
    this.#allLinks.wrapper.classList.add(styles.allLinks)
    this.#linksHighlighted = new LinkRenderer((...args) =>
      options.styleLink?.(...args)
    )
    this.#linksHighlighted.wrapper.classList.add(styles.highlightedLinks)

    this.#longestPathElement = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path'
    )
    this.#longestPathElement.setAttributeNS(null, 'class', styles.longestPath)
    this.#linksHighlighted.wrapper.append(this.#longestPathElement)
    this.wrapper.append(
      this.#allLinks.wrapper,
      this.#linksHighlighted.wrapper,
      this.#tooltip.wrapper
    )

    new ResizeObserver(([{ contentBoxSize }]) => {
      const [{ blockSize, inlineSize }] = contentBoxSize
      this.#handleResize(inlineSize, blockSize)
    }).observe(this.wrapper)
  }

  #dfs (course: Course<C, R>, direction: 'backward' | 'forward'): void {
    this.#highlighted.push(course)
    course.wrapper.classList.add(styles.highlighted)
    for (const { course: neighbor, raw } of course[direction]) {
      this.options.styleLinkedNode?.(neighbor.wrapper, neighbor.raw, {
        ...raw,
        relation: direction,
        direct: false
      })
      this.#dfs(neighbor, direction)
    }
  }

  #renderLongestPath () {
    this.#longestPathElement.setAttributeNS(
      null,
      'd',
      this.#longestPath.length > 0
        ? this.#longestPath
            .slice(0, -1)
            .map((course, i) =>
              LinkRenderer.linkPath(course, this.#longestPath[i + 1])
            )
            .join('')
        : ''
    )
  }

  #handleHoverCourse (course: Course<C, R> | null) {
    for (const course of this.#highlighted) {
      course.wrapper.classList.remove(styles.highlighted, styles.selected)
      this.options.styleLinkedNode?.(course.wrapper, course.raw, null)
    }
    if (!course) {
      this.wrapper.classList.remove(styles.courseSelected)
      this.#highlighted = []
      this.#linksHighlighted.join([])
      this.#longestPath = []
      return
    }
    this.wrapper.classList.add(styles.courseSelected)
    course.wrapper.classList.add(styles.highlighted, styles.selected)
    this.#highlighted = [course]
    this.options.styleLinkedNode?.(course.wrapper, course.raw, {
      relation: 'selected'
    })
    for (const link of course.backward) {
      link.course.wrapper.classList.add(styles.highlighted)
      this.options.styleLinkedNode?.(link.course.wrapper, course.raw, {
        ...link.raw,
        relation: 'backward',
        direct: true
      })
      this.#dfs(link.course, 'backward')
    }
    for (const link of course.forward) {
      link.course.wrapper.classList.add(styles.highlighted)
      this.options.styleLinkedNode?.(link.course.wrapper, course.raw, {
        ...link.raw,
        relation: 'forward',
        direct: true
      })
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
      this.#longestPath = [
        ...longestPathFrom(course, 'backward').reverse(),
        ...longestPathFrom(course, 'forward').slice(1)
      ]
    } catch {
      // Cycle
      this.#longestPath = []
    }
    this.#renderLongestPath()
  }

  #getCourse (event: Event, type: 'ball' | 'wrapper'): Course<C, R> | null {
    if (!(event.target instanceof HTMLElement)) {
      return null
    }
    let courseNode = event.target.closest(
      type === 'ball' ? `.${styles.courseBall}` : `.${styles.course}`
    )
    if (type === 'ball') {
      courseNode = courseNode?.parentElement ?? null
    }
    return courseNode && (this.#courseNodes.get(courseNode) ?? null)
  }

  #handlePointerOver = (e: PointerEvent): void => {
    const course = this.#getCourse(e, 'ball')
    if (course && !this.#selected) {
      this.#handleHoverCourse(course)
    }
  }

  #handlePointerOut = (e: PointerEvent): void => {
    const course = this.#getCourse(e, 'ball')
    if (course && !this.#selected) {
      this.#handleHoverCourse(null)
    }
  }

  #handleClick = (e: MouseEvent): void => {
    if (e.target instanceof Node && this.#tooltip.wrapper.contains(e.target)) {
      return
    }
    const course = this.#getCourse(e, 'ball')
    this.#selected = course
    this.#handleHoverCourse(this.#selected)
    if (course) {
      if (!course.wrapper.contains(this.#tooltip.wrapper)) {
        course.wrapper.append(this.#tooltip.wrapper)
      }
      this.#tooltip.show(course)
    } else {
      this.#tooltip.hide()
    }
  }

  #handleResize (width: number, height: number) {
    // Before editing the DOM, measure all the node positions
    this.measure()

    this.#allLinks.forceUpdate()
    this.#allLinks.setSize(width, height)
    this.#linksHighlighted.forceUpdate()
    this.#linksHighlighted.setSize(width, height)
    if (this.#longestPath.length > 0) {
      this.#renderLongestPath()
    }
    this.#tooltip.position()
  }

  setCurriculum (curriculum: ICurriculum<T>): void {
    // https://stackoverflow.com/a/61240964
    this.#maxTermLength = curriculum.curriculum_terms.reduce(
      (acc, curr) => Math.max(acc, curr.curriculum_items.length),
      0
    )

    this.wrapper.style.setProperty(
      '--term-count',
      `${curriculum.curriculum_terms.length}`
    )
    this.wrapper.style.setProperty(
      '--longest-term-length',
      `${this.#maxTermLength}`
    )

    const courses: Course<C, R>[] = []
    const coursesById: Record<number, Course<C, R>> = {}
    const items: GridItem<C, R, T>[] = []
    for (const [index, term] of curriculum.curriculum_terms.entries()) {
      items.push({ type: 'term-header', index, term })

      for (const [j, item] of term.curriculum_items.entries()) {
        const course = new Course<C, R>(item, index, j)
        items.push({ type: 'course', course })
        this.#courseNodes.set(course.wrapper, course)
        courses.push(course)

        coursesById[course.raw.id] ??= course
      }

      items.push({ type: 'term-footer', index, term })
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

  forceUpdate (): void {
    super.forceUpdate()
    this.#allLinks.forceUpdate()
    this.#linksHighlighted.forceUpdate()
  }
}
