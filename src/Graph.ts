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

class LinkRenderer {
  static #classes: {
    class: string
    type: RequisiteType
  }[] = [
    { class: styles.prereqs, type: 'prereq' },
    { class: styles.coreqs, type: 'coreq' },
    { class: styles.strictCoreqs, type: 'strict-coreq' }
  ]

  element = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  #paths = LinkRenderer.#classes.map(({ class: className }) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttributeNS(null, 'class', className)
    this.element.append(path)
    return path
  })
  links: Link[] = []

  constructor () {
    this.element.setAttributeNS(null, 'class', styles.links)
    this.element.append(defineArrow())
  }

  #linkPaths (filter: RequisiteType): string {
    const path: (string | number)[] = []
    for (const link of this.links) {
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
        continue
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

  render () {
    for (const [i, { type }] of LinkRenderer.#classes.entries()) {
      this.#paths[i].setAttributeNS(null, 'd', this.#linkPaths(type))
    }
  }

  setSize (width: number, height: number) {
    this.element.setAttributeNS(null, 'width', String(width))
    this.element.setAttributeNS(null, 'height', String(height))
  }
}

export class Graph {
  #terms: Term[] = []
  #courseNodes: WeakMap<Element, Course> = new WeakMap()
  #highlighted: Course[] = []

  wrapper: HTMLElement = Object.assign(document.createElement('div'), {
    className: styles.graph
  })
  #links = new LinkRenderer()
  #linksHighlighted = new LinkRenderer()

  constructor (curriculum?: VisualizationCurriculum) {
    this.wrapper.addEventListener('pointerover', this.#handlePointerOver)
    this.wrapper.addEventListener('pointerout', this.#handlePointerOut)
    this.#links.element.classList.add(styles.allLinks)
    this.#linksHighlighted.element.classList.add(styles.highlightedLinks)

    if (curriculum) {
      this.setCurriculum(curriculum)
    }

    new ResizeObserver(([{ contentBoxSize }]) => {
      const [{ blockSize, inlineSize }] = contentBoxSize
      this.#handleResize(inlineSize, blockSize)
    }).observe(this.wrapper)
  }

  #handleHoverCourse (course: Course | null) {
    for (const course of this.#highlighted) {
      course.wrapper.classList.remove(
        styles.highlighted,
        styles.selected,
        styles.directPrereq,
        styles.directCoreq,
        styles.directStrictCoreq,
        styles.directBlocking
      )
    }
    if (!course) {
      this.wrapper.classList.remove(styles.courseSelected)
      this.#highlighted = []
      return
    }
    this.wrapper.classList.add(styles.courseSelected)
    course.wrapper.classList.add(styles.highlighted, styles.selected)
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
    this.#highlighted = [
      course,
      ...course.backward.map(({ course }) => course),
      ...course.forward.map(({ course }) => course)
    ]
    this.#linksHighlighted.links = this.#links.links.filter(
      ({ source, target }) =>
        this.#highlighted.includes(source) && this.#highlighted.includes(target)
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
