import { Course } from './Course'
import { Term } from './Term'
import styles from './styles.module.css'
import {
  RequisiteType,
  VisualizationCurriculum,
  toRequisiteType
} from './types'

function defineArrow (): SVGDefsElement {
  const arrowPath = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path'
  )
  arrowPath.setAttributeNS(null, 'class', styles.arrow)
  arrowPath.setAttributeNS(null, 'd', 'M 0 0 L 10 5 L 0 10 z')

  const marker = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'marker'
  )
  marker.setAttributeNS(null, 'id', 'arrow')
  marker.setAttributeNS(null, 'viewBox', '0 0 10 10')
  marker.setAttributeNS(null, 'refX', '8')
  marker.setAttributeNS(null, 'refY', '5')
  marker.setAttributeNS(null, 'markerWidth', '8')
  marker.setAttributeNS(null, 'markerHeight', '8')
  marker.setAttributeNS(null, 'orient', 'auto-start-reverse')
  marker.append(arrowPath)

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
  defs.append(marker)
  return defs
}

type Link = {
  source: Course
  target: Course
  type: RequisiteType
}

export class Graph {
  #terms: Term[] = []
  #links: Link[] = []
  #courseNodes: WeakMap<Element, Course> = new WeakMap()
  #previouslyHovered: Course[] = []

  wrapper: HTMLElement = Object.assign(document.createElement('div'), {
    className: styles.graph
  })
  #linksWrapper: SVGSVGElement = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg'
  )
  #prereqs: SVGPathElement = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path'
  )
  #coreqs: SVGPathElement = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path'
  )
  #strictCoreqs: SVGPathElement = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path'
  )

  constructor (curriculum?: VisualizationCurriculum) {
    this.#linksWrapper.setAttributeNS(null, 'class', styles.links)
    this.#prereqs.setAttributeNS(null, 'class', styles.prereqs)
    this.#coreqs.setAttributeNS(null, 'class', styles.coreqs)
    this.#strictCoreqs.setAttributeNS(null, 'class', styles.strictCoreqs)
    this.#linksWrapper.append(
      defineArrow(),
      this.#prereqs,
      this.#coreqs,
      this.#strictCoreqs
    )
    this.wrapper.append(this.#linksWrapper)

    this.wrapper.addEventListener('pointerover', this.#handlePointerOver)
    this.wrapper.addEventListener('pointerout', this.#handlePointerOut)

    if (curriculum) {
      this.setCurriculum(curriculum)
    }

    new ResizeObserver(([{ contentBoxSize }]) => {
      const [{ blockSize, inlineSize }] = contentBoxSize
      this.#handleResize(inlineSize, blockSize)
    }).observe(this.wrapper)
  }

  #handleHoverCourse (course: Course | null) {
    for (const course of this.#previouslyHovered) {
      course.wrapper.classList.remove(
        styles.highlighted,
        styles.hovered,
        styles.directPrereq,
        styles.directCoreq,
        styles.directStrictCoreq,
        styles.directBlocking
      )
    }
    if (!course) {
      this.wrapper.classList.remove(styles.hoveringCourse)
      this.#previouslyHovered = []
      return
    }
    this.wrapper.classList.add(styles.hoveringCourse)
    course.wrapper.classList.add(styles.highlighted, styles.hovered)
    for (const { course: prereq, type } of course.backward) {
      prereq.wrapper.classList.add(
        styles.highlighted,
        type === 'prereq'
          ? styles.directPrereq
          : type === 'coreq'
          ? styles.directCoreq
          : styles.directStrictCoreq
      )
    }
    for (const { course: blocking } of course.forward) {
      blocking.wrapper.classList.add(styles.highlighted, styles.directBlocking)
    }
    this.#previouslyHovered = [
      course,
      ...course.backward.map(({ course }) => course),
      ...course.forward.map(({ course }) => course)
    ]
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

  #linkPaths (filter: RequisiteType): string {
    const path: (string | number)[] = []
    for (const link of this.#links) {
      if (link.type !== filter) {
        continue
      }
      if (link.source === link.target) {
        continue
      }
      // Same term (e.g. coreqs)
      if (link.source.term === link.target.term) {
        const minY = Math.min(link.source.position.y, link.target.position.y)
        const maxY = Math.max(link.source.position.y, link.target.position.y)
        path.push(
          'M',
          // Source should be behind target
          link.source.position.x,
          minY + link.source.position.radius,
          'L',
          link.target.position.x,
          maxY - link.target.position.radius
        )
        continue
      }

      const minX = Math.min(link.source.position.x, link.target.position.x)
      const maxX = Math.max(link.source.position.x, link.target.position.x)
      const midpoint = (link.source.position.x + link.target.position.x) / 2

      // Same y-level, more than one term apart
      if (
        link.source.index === link.target.index &&
        Math.abs(link.source.term.index - link.target.term.index) > 1
      ) {
        path.push(
          'M',
          // Source should be behind target
          minX + link.source.position.radius,
          link.source.position.y,
          'Q',
          midpoint,
          link.source.position.y + 40,
          maxX - link.target.position.radius,
          link.target.position.y
        )
      }

      path.push(
        'M',
        // Source should be behind target
        minX + link.source.position.radius,
        link.source.position.y,
        'C',
        midpoint,
        link.source.position.y,
        midpoint,
        link.target.position.y,
        maxX - link.target.position.radius,
        link.target.position.y
      )
    }
    return path.join(' ')
  }

  #handleResize (width: number, height: number) {
    // Before editing the DOM, measure all the node positions
    for (const term of this.#terms) {
      for (const course of term.courses) {
        course.measurePosition()
      }
    }

    this.#linksWrapper.setAttributeNS(null, 'width', String(width))
    this.#linksWrapper.setAttributeNS(null, 'height', String(height))

    this.#prereqs.setAttributeNS(null, 'd', this.#linkPaths('prereq'))
    this.#coreqs.setAttributeNS(null, 'd', this.#linkPaths('coreq'))
    this.#strictCoreqs.setAttributeNS(
      null,
      'd',
      this.#linkPaths('strict-coreq')
    )
  }

  setCurriculum (curriculum: VisualizationCurriculum): void {
    // Remove all elements
    while (this.wrapper.firstChild) {
      this.wrapper.removeChild(this.wrapper.firstChild)
    }
    this.wrapper.append(this.#linksWrapper)

    // https://stackoverflow.com/a/61240964
    this.wrapper.style.gridTemplateColumns = `repeat(${curriculum.curriculum_terms.length}, minmax(0, 1fr))`
    const maxTermLength = curriculum.curriculum_terms.reduce(
      (acc, curr) => Math.max(acc, curr.curriculum_items.length),
      0
    )
    this.wrapper.style.gridTemplateRows = `40px repeat(${maxTermLength}, minmax(0, 1fr)) 60px`

    const courses: Record<number, Course> = {}
    this.#terms = []
    this.#links = []
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
          this.#links.push({
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
