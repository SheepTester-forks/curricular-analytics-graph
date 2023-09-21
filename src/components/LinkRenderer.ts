import { RequisiteType } from '../types'
import { Course } from './Course'
import styles from '../styles.module.css'

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

export type Link = {
  source: Course
  target: Course
  type: RequisiteType
}

export class LinkRenderer {
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

  #linkPath (link: Link): string {
    if (link.source === link.target) {
      return ''
    }
    // Same term (e.g. coreqs)
    if (link.source.term === link.target.term) {
      const minY = Math.min(link.source.position.y, link.target.position.y)
      const maxY = Math.max(link.source.position.y, link.target.position.y)
      const midpoint = (link.source.position.y + link.target.position.y) / 2

      // More than one course apart
      const diff = Math.abs(link.source.index - link.target.index)
      if (diff > 1) {
        return [
          'M',
          // Source should be behind target
          link.source.position.x,
          minY + link.source.position.radius,
          'Q',
          link.source.position.x +
            (diff * 10 + 30) *
              (link.source.position.y < link.target.position.y ? -1 : 1),
          midpoint,
          link.target.position.x,
          maxY - link.target.position.radius
        ].join(' ')
      }

      return [
        'M',
        // Source should be behind target
        link.source.position.x,
        minY + link.source.position.radius,
        'L',
        link.target.position.x,
        maxY - link.target.position.radius
      ].join(' ')
    }

    const minX = Math.min(link.source.position.x, link.target.position.x)
    const maxX = Math.max(link.source.position.x, link.target.position.x)
    const midpoint = (link.source.position.x + link.target.position.x) / 2

    // Same y-level, more than one term apart
    const diff = Math.abs(link.source.term.index - link.target.term.index)
    if (link.source.index === link.target.index && diff > 1) {
      return [
        'M',
        // Source should be behind target
        minX + link.source.position.radius,
        link.source.position.y,
        'Q',
        midpoint,
        link.source.position.y + diff * 10 + 30,
        maxX - link.target.position.radius,
        link.target.position.y
      ].join(' ')
    }

    return [
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
    ].join(' ')
  }

  #linkPaths (filter: RequisiteType): string {
    let path = ''
    for (const link of this.links) {
      if (link.type !== filter) {
        continue
      }
      path += this.#linkPath(link)
    }
    return path
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
