import { Course, longestPathFrom } from './Course'
import styles from '../styles.module.css'
import { VisualizationCurriculum, toRequisiteType } from '../types'
import { Link, LinkRenderer } from './LinkRenderer'
import { Join } from '../util/Join'

type GridItem =
  | { type: 'course'; course: Course }
  | { type: 'term-header'; index: number; name: string }
  | { type: 'term-footer'; index: number; complexity: number }

export class Graph extends Join<GridItem, HTMLElement> {
  #courseNodes: WeakMap<Element, Course> = new WeakMap()
  #highlighted: Course[] = []

  #links: Link[] = []
  #allLinks = new LinkRenderer()
  #linksHighlighted = new LinkRenderer()
  #longestPath: SVGPathElement

  #maxTermLength: number = 0

  constructor (curriculum?: VisualizationCurriculum) {
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
          const { metrics, name, nameSub, nameCanonical } = course.raw
          course.ball.textContent = String(metrics.complexity ?? '')
          course.name.title = course.name.textContent =
            name +
            (nameSub ? `\n${nameSub}` : '') +
            (nameCanonical ? `\n(${nameCanonical})` : '')
          element.style.gridColumn = `${course.term + 1} / ${course.term + 2}`
          element.setAttribute(
            'aria-describedby',
            `term-heading-${course.index}`
          )
        } else if (item.type === 'term-header') {
          element.textContent = item.name
        } else if (item.type === 'term-footer') {
          element.textContent = `Complexity: ${item.complexity}`
          element.style.gridRow = `${this.#maxTermLength + 2}`
        }
      },
      measure: item => {
        if (item.type === 'course') {
          item.course.measurePosition()
        }
      }
    })

    this.wrapper.addEventListener('pointerover', this.#handlePointerOver)
    this.wrapper.addEventListener('pointerout', this.#handlePointerOut)
    this.#allLinks.wrapper.classList.add(styles.allLinks)
    this.#linksHighlighted.wrapper.classList.add(styles.highlightedLinks)

    this.#longestPath = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path'
    )
    this.#longestPath.setAttributeNS(null, 'class', styles.longestPath)
    this.#linksHighlighted.wrapper.append(this.#longestPath)
    this.wrapper.append(
      this.#allLinks.wrapper,
      this.#linksHighlighted.wrapper,
      this.#longestPath
    )

    if (curriculum) {
      this.setCurriculum(curriculum)
    }

    new ResizeObserver(([{ contentBoxSize }]) => {
      const [{ blockSize, inlineSize }] = contentBoxSize
      this.#handleResize(inlineSize, blockSize)
    }).observe(this.wrapper)
  }

  #dfs (course: Course, direction: 'backward' | 'forward'): void {
    this.#highlighted.push(course)
    course.wrapper.classList.add(
      styles.highlighted,
      direction === 'backward' ? styles.prereq : styles.blocking
    )
    for (const { course: neighbor } of course[direction]) {
      this.#dfs(neighbor, direction)
    }
  }

  #handleHoverCourse (course: Course | null) {
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
    for (const { course: prereq, type } of course.backward) {
      prereq.wrapper.classList.add(
        styles.highlighted,
        type === 'prereq'
          ? styles.directPrereq
          : type === 'coreq'
          ? styles.directCoreq
          : styles.directStrictCoreq
      )
      this.#dfs(prereq, 'backward')
    }
    for (const { course: blocking } of course.forward) {
      blocking.wrapper.classList.add(styles.highlighted, styles.directBlocking)
      this.#dfs(blocking, 'forward')
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

  setCurriculum (curriculum: VisualizationCurriculum): void {
    // https://stackoverflow.com/a/61240964
    this.#maxTermLength = curriculum.curriculum_terms.reduce(
      (acc, curr) => Math.max(acc, curr.curriculum_items.length),
      0
    )

    this.wrapper.style.gridTemplateColumns = `repeat(${curriculum.curriculum_terms.length}, minmax(0, 1fr))`
    this.wrapper.style.gridTemplateRows = `40px repeat(${
      this.#maxTermLength
    }, minmax(0, 1fr)) 60px`

    const courses: Course[] = []
    const coursesById: Record<number, Course> = {}
    const items: GridItem[] = []
    for (const [i, term] of curriculum.curriculum_terms.entries()) {
      items.push({ type: 'term-header', index: i, name: term.name })

      for (const [j, item] of term.curriculum_items.entries()) {
        const course = new Course(item, i, j)
        items.push({ type: 'course', course })
        this.#courseNodes.set(course.ball, course)
        courses.push(course)

        coursesById[course.raw.id] ??= course
      }

      items.push({
        type: 'term-footer',
        index: i,
        complexity: term.curriculum_items.reduce(
          (acc, curr) => acc + (curr.metrics.complexity ?? 0),
          0
        )
      })
    }

    this.#links = []
    for (const target of courses) {
      for (const requisite of target.raw.curriculum_requisites) {
        const source = coursesById[requisite.source_id]
        const type = toRequisiteType(requisite.type)
        this.#links.push({
          source,
          target,
          type
        })
        source.forward.push({ course: target, type })
        target.backward.push({ course: source, type })
      }
    }

    this.join(items)
    this.#allLinks.join(this.#links)
  }
}
