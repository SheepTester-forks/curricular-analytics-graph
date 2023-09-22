import { Course, longestPathFrom } from './Course'
import { Term } from './Term'
import styles from '../styles.module.css'
import { VisualizationCurriculum, toRequisiteType } from '../types'
import { LinkRenderer } from './LinkRenderer'

export class Graph {
  #terms: Term[] = []
  #courseNodes: WeakMap<Element, Course> = new WeakMap()
  #highlighted: Course[] = []

  wrapper: HTMLElement = Object.assign(document.createElement('div'), {
    className: styles.graph
  })
  #links = new LinkRenderer()
  #linksHighlighted = new LinkRenderer()
  #longestPath: SVGPathElement

  constructor (curriculum?: VisualizationCurriculum) {
    this.wrapper.addEventListener('pointerover', this.#handlePointerOver)
    this.wrapper.addEventListener('pointerout', this.#handlePointerOut)
    this.#links.element.classList.add(styles.allLinks)
    this.#linksHighlighted.element.classList.add(styles.highlightedLinks)

    this.#longestPath = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path'
    )
    this.#longestPath.setAttributeNS(null, 'class', styles.longestPath)
    this.#linksHighlighted.element.append(this.#longestPath)

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
    this.#linksHighlighted.links = this.#links.links.filter(
      ({ source, target }) =>
        this.#highlighted.includes(source) && this.#highlighted.includes(target)
    )
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
    this.#linksHighlighted.render()
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

  #render () {
    // Before editing the DOM, measure all the node positions
    for (const term of this.#terms) {
      for (const course of term.courses) {
        course.measurePosition()
      }
    }

    this.#links.render()
  }

  #handleResize (width: number, height: number) {
    this.#render()
    this.#linksHighlighted.render()
    this.#links.setSize(width, height)
    this.#linksHighlighted.setSize(width, height)
  }

  setCurriculum (curriculum: VisualizationCurriculum): void {
    // Remove all elements
    while (this.wrapper.firstChild) {
      this.wrapper.removeChild(this.wrapper.firstChild)
    }
    this.wrapper.append(this.#links.element)
    this.wrapper.append(this.#linksHighlighted.element)
    this.#linksHighlighted.element.classList.add(styles.selectedLinks)

    // https://stackoverflow.com/a/61240964
    this.wrapper.style.gridTemplateColumns = `repeat(${curriculum.curriculum_terms.length}, minmax(0, 1fr))`
    const maxTermLength = curriculum.curriculum_terms.reduce(
      (acc, curr) => Math.max(acc, curr.curriculum_items.length),
      0
    )
    this.wrapper.style.gridTemplateRows = `40px repeat(${maxTermLength}, minmax(0, 1fr)) 60px`

    const courses: Record<number, Course> = {}
    this.#terms = []
    this.#links.links = []
    for (const [i, termDatum] of curriculum.curriculum_terms.entries()) {
      const term = new Term(termDatum, i)
      this.#terms.push(term)
      term.heading.id = `term-heading-${i}`
      term.heading.style.gridColumn = `${i + 1} / ${i + 2}`
      this.wrapper.append(term.heading)

      for (const course of term.courses) {
        course.wrapper.style.gridColumn = `${i + 1} / ${i + 2}`
        course.wrapper.setAttribute('aria-describedby', `term-heading-${i}`)
        this.wrapper.append(course.wrapper)
        this.#courseNodes.set(course.ball, course)

        courses[course.raw.id] ??= course
      }

      term.footer.style.gridColumn = `${i + 1} / ${i + 2}`
      term.footer.style.gridRow = `${maxTermLength + 2}`
      term.footer.setAttribute('aria-describedby', `term-heading-${i}`)
      this.wrapper.append(term.footer)
    }

    for (const term of this.#terms) {
      for (const target of term.courses) {
        for (const requisite of target.raw.curriculum_requisites) {
          const source = courses[requisite.source_id]
          const type = toRequisiteType(requisite.type)
          this.#links.links.push({
            source,
            target,
            type
          })
          source.forward.push({ course: target, type })
          target.backward.push({ course: source, type })
        }
      }
    }
  }
}
