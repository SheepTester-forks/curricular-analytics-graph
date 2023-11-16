import { Course } from './Course'
import styles from '../styles.module.css'
import { Link, LinkHandler, LinkRenderer } from './LinkRenderer'
import { Join } from '../util/Join'
import { Tooltip, TooltipOptions } from './Tooltip'
import { GraphNode, longestPathFrom } from '../graph-utils'

type GridItem<T> =
  | { type: 'course'; course: Course<T>; index: number }
  | { type: 'term-header'; index: number; term: T[] }
  | { type: 'term-footer'; index: number; term: T[] }

export type GraphOptions<T> = TooltipOptions<T> & {
  /** Shown at the top of each term column. */
  termName: (term: T[], index: number) => string
  /** Shown at the bottom of each term column. */
  termSummary: (term: T[], index: number) => string
  /** Shown under each course node. */
  courseName: (course: T) => string
  /** Shown inside each course node. */
  courseNode: (course: T) => string
  /** Apply styles to a node. */
  styleNode: (element: HTMLElement, course: T) => void
  /** Apply styles to a link. */
  styleLink: LinkHandler<T>
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
    course: T,
    relationship:
      | { relation: 'backwards' | 'forwards'; direct: boolean; from: T }
      | { relation: 'selected' }
      | null
  ) => void
}

export class Graph<T extends GraphNode<T>> extends Join<
  GridItem<T>,
  HTMLElement
> {
  #courseNodes = new WeakMap<Element, Course<T>>()
  #courseObjects = new WeakMap<T, Course<T>>()
  #highlighted: Course<T>[] = []
  #selected: Course<T> | null = null

  #links: Link<T>[] = []
  #allLinks: LinkRenderer<T>
  #linksHighlighted: LinkRenderer<T>
  #longestPath: Course<T>[] = []
  #longestPathElement: SVGPathElement

  #tooltip: Tooltip<T>

  #maxTermLength: number = 0
  options: Partial<GraphOptions<T>>

  constructor (options: Partial<GraphOptions<T>> = {}) {
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
          course.ballLabel.nodeValue =
            this.options.courseNode?.(item.course.raw) ?? null
          this.options.styleNode?.(course.ball, item.course.raw)
          element.style.gridColumn = `${course.term + 1} / ${course.term + 2}`
          element.style.gridRow = `${item.index + 1} / ${item.index + 2}`
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
    this.#tooltip = new Tooltip<T>({
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

  #fromRaw = (raw: T): Course<T> => {
    const object = this.#courseObjects.get(raw)
    if (!object) {
      throw new TypeError('Course does not have an associated course object.')
    }
    return object
  }

  #dfs (course: Course<T>, direction: 'backwards' | 'forwards'): void {
    this.#highlighted.push(course)
    course.wrapper.classList.add(styles.highlighted)
    for (const neighbor of course.raw[direction]) {
      const neighborObj = this.#fromRaw(neighbor)
      this.options.styleLinkedNode?.(neighborObj.wrapper, neighbor, {
        relation: direction,
        direct: false,
        from: course.raw
      })
      this.#dfs(neighborObj, direction)
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

  #handleHoverCourse (course: Course<T> | null) {
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
    for (const direction of ['backwards', 'forwards'] as const) {
      for (const neighbor of course.raw[direction]) {
        const neighborObj = this.#fromRaw(neighbor)
        neighborObj.wrapper.classList.add(styles.highlighted)
        this.options.styleLinkedNode?.(neighborObj.wrapper, neighbor, {
          relation: direction,
          direct: true,
          from: course.raw
        })
        this.#dfs(neighborObj, direction)
      }
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
        ...longestPathFrom(course.raw, 'backwards').reverse(),
        ...longestPathFrom(course.raw, 'forwards').slice(1)
      ].map(this.#fromRaw)
    } catch {
      // Cycle
      this.#longestPath = []
    }
    this.#renderLongestPath()
  }

  #getCourse (event: Event, type: 'ball' | 'wrapper'): Course<T> | null {
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
      this.#tooltip.show(course, course.raw.backwards.map(this.#fromRaw))
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

  setCurriculum (curriculum: T[][]): void {
    // https://stackoverflow.com/a/61240964
    this.#maxTermLength = curriculum.reduce(
      (acc, curr) => Math.max(acc, curr.length),
      0
    )

    this.wrapper.style.setProperty('--term-count', `${curriculum.length}`)
    this.wrapper.style.setProperty(
      '--longest-term-length',
      `${this.#maxTermLength}`
    )

    const items: GridItem<T>[] = []
    this.#links = []
    for (const [index, term] of curriculum.entries()) {
      items.push({ type: 'term-header', index, term })

      for (const [j, item] of term.entries()) {
        const course = new Course<T>(item, index, j)
        items.push({ type: 'course', course, index: j + 1 })
        this.#courseNodes.set(course.wrapper, course)
        this.#courseObjects.set(item, course)
      }

      items.push({ type: 'term-footer', index, term })
    }
    for (const course of items) {
      if (course.type !== 'course') {
        continue
      }
      for (const target of course.course.raw.forwards) {
        this.#links.push({
          source: course.course,
          target: this.#fromRaw(target)
        })
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
