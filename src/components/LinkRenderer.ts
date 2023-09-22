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

  static linkPath (source: Course, target: Course): string {
    if (source === target) {
      return ''
    }
    // Same term (e.g. coreqs)
    if (source.term === target.term) {
      const minY = Math.min(source.position.y, target.position.y)
      const maxY = Math.max(source.position.y, target.position.y)
      const midpoint = (source.position.y + target.position.y) / 2

      // More than one course apart
      const diff = Math.abs(source.index - target.index)
      if (diff > 1) {
        return [
          'M',
          // Source should be behind target
          source.position.x,
          minY + source.position.radius,
          'Q',
          source.position.x +
            (diff * 10 + 30) * (source.position.y < target.position.y ? -1 : 1),
          midpoint,
          target.position.x,
          maxY - target.position.radius
        ].join(' ')
      }

      return [
        'M',
        // Source should be behind target
        source.position.x,
        minY + source.position.radius,
        'L',
        target.position.x,
        maxY - target.position.radius
      ].join(' ')
    }

    const minX = Math.min(source.position.x, target.position.x)
    const maxX = Math.max(source.position.x, target.position.x)
    const midpoint = (source.position.x + target.position.x) / 2

    // Same y-level, more than one term apart
    const diff = Math.abs(source.term.index - target.term.index)
    if (source.index === target.index && diff > 1) {
      return [
        'M',
        // Source should be behind target
        minX + source.position.radius,
        source.position.y,
        'Q',
        midpoint,
        source.position.y + diff * 10 + 30,
        maxX - target.position.radius,
        target.position.y
      ].join(' ')
    }

    return [
      'M',
      // Source should be behind target
      minX + source.position.radius,
      source.position.y,
      'C',
      midpoint,
      source.position.y,
      midpoint,
      target.position.y,
      maxX - target.position.radius,
      target.position.y
    ].join(' ')
  }

  #linkPaths (filter: RequisiteType): string {
    let path = ''
    for (const link of this.links) {
      if (link.type !== filter) {
        continue
      }
      path += LinkRenderer.linkPath(link.source, link.target)
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
