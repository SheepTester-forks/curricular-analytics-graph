import * as GraphUtils from '../graph-utils'
import { GraphNode, longestPathFrom } from '../graph-utils'
import styles from '../styles.module.css'
import { Course, Link } from '../types'
import { Join } from '../util/Join'
import { CourseNode } from './CourseNode'
import { NodeLink, LinkHandler, LinkRenderer } from './LinkRenderer'
import { Tooltip, TooltipTitleInput } from './Tooltip'

type GridItem<T> =
  | { type: 'course'; node: CourseNode<T>; index: number }
  | { type: 'term-background'; index: number }
  | { type: 'term-header'; index: number; term: CourseNode<T>[] }
  | { type: 'term-footer'; index: number; term: CourseNode<T>[] }

export type GraphOptions<T> = {
  /** Default: semester. Multiplies complexity by 2/3. */
  system: 'semester' | 'quarter'
  /** Shown at the top of each term column. */
  termName: (term: Course<T>[], index: number) => string
  /** Shown at the bottom of each term column. */
  termSummary: (term: Course<T>[], index: number) => string
  /** Shown under each course node. */
  courseName: (course: Course<T>) => string
  /** Shown inside each course node. */
  courseNode: (course: Course<T>) => string
  /** Apply styles to a node. */
  styleNode: (course: Course<T>) => void
  /** Apply styles to a link. */
  styleLink: (link: Link<T>) => void
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
    course: Course<T>,
    relationship:
      | { relation: 'backwards' | 'forwards'; direct: boolean; from: T }
      | { relation: 'selected' }
      | null
  ) => void
  tooltipTitle: (course: Course<T>) => string | TooltipTitleInput
  onTooltipTitleChange: (course: Course<T>, content: string) => void
  tooltipContent: (course: Course<T>) => [string, string][]
  tooltipRequisiteInfo: (
    element: HTMLElement,
    link: Omit<Link<T>, 'element'>
  ) => void
}

export class Graph<T extends GraphNode<T>> extends Join<
  GridItem<T>,
  HTMLElement
> {
  #courseNodes = new WeakMap<Element, CourseNode<T>>()
  #courseObjects = new WeakMap<T, CourseNode<T>>()
  #highlighted: CourseNode<T>[] = []
  #selected: CourseNode<T> | null = null

  #links: NodeLink<T>[] = []
  #allLinks: LinkRenderer<T>
  #linksHighlighted: LinkRenderer<T>
  #longestPath: CourseNode<T>[] = []
  #longestPathElement: SVGPathElement

  #tooltip: Tooltip<T>

  #redundantReqs = new Map<T, Set<T>>()

  #maxTermLength: number = 0
  options: Partial<GraphOptions<T>>

  constructor (options: Partial<GraphOptions<T>> = {}) {
    super({
      wrapper: Object.assign(document.createElement('div'), {
        className: styles.graph
      }),
      key: item =>
        item.type === 'course'
          ? `course\0${item.node.id}`
          : `${item.type}\0${item.index}`,
      enter: item => {
        if (item.type === 'course') {
          return item.node.wrapper
        } else if (item.type === 'term-header') {
          const header = Object.assign(document.createElement('div'), {
            className: styles.termHeading,
            role: 'columnheader',
            id: `term-heading-${item.index}`
          })
          header.style.gridColumn = `${item.index + 1}`
          return header
        } else if (item.type === 'term-footer') {
          const footer = Object.assign(document.createElement('div'), {
            className: styles.termFooter
          })
          footer.style.gridColumn = `${item.index + 1}`
          footer.setAttribute('aria-describedby', `term-heading-${item.index}`)
          return footer
        } else if (item.type === 'term-background') {
          const background = Object.assign(document.createElement('div'), {
            className: styles.termBackground
          })
          background.style.gridColumn = `${item.index + 1}`
          return background
        } else {
          throw new TypeError(`${item['type']}??`)
        }
      },
      update: (item, element) => {
        if (item.type === 'course') {
          const course = item.node
          course.name.title = course.name.textContent =
            this.options.courseName?.(item.node) ?? ''
          course.ballLabel.nodeValue =
            this.options.courseNode?.(item.node) ?? null
          this.options.styleNode?.(item.node)
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
        }
      },
      measure: {
        getParentRect: () => {
          return this.wrapper.getBoundingClientRect()
        },
        measureChild: (item, _, parentRect) => {
          if (item.type === 'course') {
            item.node.measurePosition(parentRect)
          }
        }
      }
    })

    this.options = options
    this.#tooltip = new Tooltip<T>({
      tooltipTitle: node => options.tooltipTitle?.(node) ?? '',
      onTooltipTitleChange: (node, content) =>
        options.onTooltipTitleChange?.(node, content),
      tooltipContent: node => options.tooltipContent?.(node) ?? [],
      tooltipRequisiteInfo: (element, source, target) => {
        options.tooltipRequisiteInfo?.(element, {
          source,
          target,
          redundant:
            this.#redundantReqs.get(source.course)?.has(target.course) ?? false
        })
      }
    })

    this.wrapper.addEventListener('pointerover', this.#handlePointerOver)
    this.wrapper.addEventListener('pointerout', this.#handlePointerOut)
    this.wrapper.addEventListener('click', this.#handleClick)

    const styleLink: LinkHandler<T> = (element, source, target) => {
      options.styleLink?.({
        source,
        target,
        element,
        redundant:
          this.#redundantReqs.get(source.course)?.has(target.course) ?? false
      })
    }
    this.#allLinks = new LinkRenderer(styleLink)
    this.#allLinks.wrapper.classList.add(styles.allLinks)
    this.#linksHighlighted = new LinkRenderer(styleLink)
    this.#linksHighlighted.wrapper.classList.add(styles.highlightedLinks)

    this.#longestPathElement = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path'
    )
    this.#longestPathElement.setAttributeNS(null, 'class', styles.longestPath)
    this.#linksHighlighted.wrapper.prepend(this.#longestPathElement)
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

  #fromRaw = (raw: T): CourseNode<T> => {
    const object = this.#courseObjects.get(raw)
    if (!object) {
      throw new TypeError('Course does not have an associated course object.')
    }
    return object
  }

  #dfs (node: CourseNode<T>, direction: 'backwards' | 'forwards'): void {
    this.#highlighted.push(node)
    node.wrapper.classList.add(styles.highlighted)
    for (const neighbor of node.course[direction]) {
      const neighborObj = this.#fromRaw(neighbor)
      this.options.styleLinkedNode?.(neighborObj, {
        relation: direction,
        direct: false,
        from: node.course
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

  #handleHoverNode (node: CourseNode<T> | null) {
    for (const node of this.#highlighted) {
      node.wrapper.classList.remove(styles.highlighted, styles.selected)
      this.options.styleLinkedNode?.(node, null)
    }
    if (!node) {
      this.wrapper.classList.remove(styles.courseSelected)
      this.#highlighted = []
      this.#linksHighlighted.join([])
      this.#longestPath = []
      return
    }
    this.wrapper.classList.add(styles.courseSelected)
    node.wrapper.classList.add(styles.highlighted, styles.selected)
    this.#highlighted = [node]
    this.options.styleLinkedNode?.(node, { relation: 'selected' })
    for (const direction of ['backwards', 'forwards'] as const) {
      for (const neighbor of node.course[direction]) {
        const neighborObj = this.#fromRaw(neighbor)
        neighborObj.wrapper.classList.add(styles.highlighted)
        this.options.styleLinkedNode?.(neighborObj, {
          relation: direction,
          direct: true,
          from: node.course
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
        ...longestPathFrom(node.course, 'backwards').reverse(),
        ...longestPathFrom(node.course, 'forwards').slice(1)
      ].map(this.#fromRaw)
    } catch {
      // Cycle
      this.#longestPath = []
    }
    this.#renderLongestPath()
  }

  #getNode (event: Event, type: 'ball' | 'wrapper'): CourseNode<T> | null {
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
    const course = this.#getNode(e, 'ball')
    if (course && !this.#selected) {
      this.#handleHoverNode(course)
    }
  }

  #handlePointerOut = (e: PointerEvent): void => {
    const course = this.#getNode(e, 'ball')
    if (course && !this.#selected) {
      this.#handleHoverNode(null)
    }
  }

  #handleClick = (e: MouseEvent): void => {
    if (e.target instanceof Node && this.#tooltip.wrapper.contains(e.target)) {
      return
    }
    const node = this.#getNode(e, 'ball')
    this.#selected = node
    this.#handleHoverNode(this.#selected)
    if (node) {
      if (!node.wrapper.contains(this.#tooltip.wrapper)) {
        node.wrapper.append(this.#tooltip.wrapper)
      }
      this.#tooltip.show(node, node.course.backwards.map(this.#fromRaw))
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

  setDegreePlan (degreePlan: T[][]): void {
    const curriculum = degreePlan.flat()
    const blockingFactors = new Map(
      curriculum.map(course => [course, GraphUtils.blockingFactor(course)])
    )
    const allPaths = GraphUtils.allPaths(curriculum)
    const delayFactors = GraphUtils.delayFactors(allPaths)
    const complexities = GraphUtils.complexities(
      blockingFactors,
      delayFactors,
      this.options.system ?? 'semester'
    )
    const centralities = new Map(
      curriculum.map(course => [
        course,
        GraphUtils.centrality(allPaths, course)
      ])
    )
    this.#redundantReqs = GraphUtils.redundantRequisites(curriculum)

    this.#maxTermLength = degreePlan.reduce(
      (acc, curr) => Math.max(acc, curr.length),
      1
    )
    this.wrapper.style.setProperty('--term-count', `${degreePlan.length}`)
    this.wrapper.style.setProperty(
      '--longest-term-length',
      `${this.#maxTermLength}`
    )

    const items: GridItem<T>[] = []
    this.#links = []
    for (const [index, courses] of degreePlan.entries()) {
      const term: CourseNode<T>[] = []
      items.push({ type: 'term-header', index, term })
      items.push({ type: 'term-background', index })

      for (const [j, course] of courses.entries()) {
        const node = new CourseNode<T>(course, index, j, {
          blockingFactor: blockingFactors.get(course) ?? 0,
          delayFactor: delayFactors.get(course) ?? 1,
          complexity: complexities.get(course) ?? 0,
          centrality: centralities.get(course) ?? 0
        })
        term.push(node)
        items.push({ type: 'course', node: node, index: j + 1 })
        this.#courseNodes.set(node.wrapper, node)
        this.#courseObjects.set(course, node)
      }

      items.push({ type: 'term-footer', index, term })
    }
    for (const node of items) {
      if (node.type !== 'course') {
        continue
      }
      for (const target of node.node.course.forwards) {
        this.#links.push({
          source: node.node,
          target: this.#fromRaw(target)
        })
      }
    }

    this.join(items)
    this.measure()
    this.#allLinks.join(this.#links)
  }

  forceUpdate (): void {
    super.forceUpdate()
    this.#allLinks.forceUpdate()
    this.#linksHighlighted.forceUpdate()
  }
}
