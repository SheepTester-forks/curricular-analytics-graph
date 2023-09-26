import { RequisiteType } from '../types'
import { Course } from './Course'
import styles from '../styles.module.css'
import { Join } from '../util/join'

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

export class LinkRenderer extends Join<Link, SVGPathElement> {
  static #classes: Record<RequisiteType, string> = {
    prereq: styles.prereqs,
    coreq: styles.coreqs,
    'strict-coreq': styles.strictCoreqs
  }

  links: Link[] = []

  constructor () {
    super({
      wrapper: document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
      key: link => `${link.source.name}\0${link.target.name}`,
      enter: () =>
        document.createElementNS('http://www.w3.org/2000/svg', 'path'),
      update: ({ source, target, type }, element, _old) => {
        element.setAttributeNS(null, 'd', LinkRenderer.linkPath(source, target))
        element.setAttributeNS(null, 'class', LinkRenderer.#classes[type])
      }
    })
    this.wrapper.setAttributeNS(null, 'class', styles.links)
    this.wrapper.append(defineArrow())
  }

  /** Returns the path for a link between two courses. */
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

  setSize (width: number, height: number) {
    this.wrapper.setAttributeNS(null, 'width', String(width))
    this.wrapper.setAttributeNS(null, 'height', String(height))
  }
}
