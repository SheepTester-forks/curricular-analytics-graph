import { Course } from './Course'
import styles from '../styles.module.css'
import { Join } from '../util/Join'

function defineArrow (): SVGDefsElement {
  const arrowPath = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path'
  )
  arrowPath.classList.add(styles.arrow)
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
  marker.setAttributeNS(null, 'markerUnits', 'userSpaceOnUse')
  marker.setAttributeNS(null, 'orient', 'auto-start-reverse')
  marker.append(arrowPath)

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
  defs.append(marker)
  return defs
}

export type Link<T> = {
  source: Course<T>
  target: Course<T>
}

export type LinkHandler<T> = (
  element: SVGPathElement,
  source: T,
  target: T
) => void

export class LinkRenderer<T> extends Join<
  Link<T>,
  SVGPathElement,
  SVGSVGElement
> {
  constructor (handleLink: LinkHandler<T>) {
    super({
      wrapper: document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
      key: link => `${link.source.id}\0${link.target.id}`,
      enter: () =>
        document.createElementNS('http://www.w3.org/2000/svg', 'path'),
      update: ({ source, target }, element, _old) => {
        element.setAttributeNS(null, 'd', LinkRenderer.linkPath(source, target))
        handleLink(element, source.raw, target.raw)
      }
    })
    this.wrapper.classList.add(styles.links)
    this.wrapper.append(defineArrow())
  }

  /** Returns the path for a link between two courses. */
  static linkPath<T> (source: Course<T>, target: Course<T>): string {
    if (source === target) {
      return ''
    }
    // Same term (e.g. coreqs)
    if (source.term === target.term) {
      const midpoint = (source.position.y + target.position.y) / 2

      // More than one course apart
      const diff = Math.abs(source.index - target.index)
      if (diff > 1) {
        return [
          'M',
          // Source should be behind target
          source.position.x,
          source.position.y +
            source.position.radius *
              (source.position.y < target.position.y ? 1 : -1),
          'Q',
          source.position.x +
            (diff * 10 + 30) * (source.position.y < target.position.y ? -1 : 1),
          midpoint,
          target.position.x,
          target.position.y +
            target.position.radius *
              (target.position.y < source.position.y ? 1 : -1)
        ].join(' ')
      }

      return [
        'M',
        // Source should be behind target
        source.position.x,
        source.position.y +
          source.position.radius *
            (source.position.y < target.position.y ? 1 : -1),
        'L',
        target.position.x,
        target.position.y +
          target.position.radius *
            (target.position.y < source.position.y ? 1 : -1)
      ].join(' ')
    }

    const midpoint = (source.position.x + target.position.x) / 2

    // Same y-level, more than one term apart
    const diff = Math.abs(source.term - target.term)
    if (source.index === target.index && diff > 1) {
      return [
        'M',
        // Source should be behind target
        source.position.x +
          source.position.radius *
            (source.position.x < target.position.x ? 1 : -1),
        source.position.y,
        'Q',
        midpoint,
        source.position.y + diff * 10 + 30,
        target.position.x +
          target.position.radius *
            (target.position.x < source.position.x ? 1 : -1),
        target.position.y
      ].join(' ')
    }

    return [
      'M',
      // Source should be behind target
      source.position.x +
        source.position.radius *
          (source.position.x < target.position.x ? 1 : -1),
      source.position.y,
      'C',
      midpoint,
      source.position.y,
      midpoint,
      target.position.y,
      target.position.x +
        target.position.radius *
          (target.position.x < source.position.x ? 1 : -1),
      target.position.y
    ].join(' ')
  }

  setSize (width: number, height: number) {
    this.wrapper.setAttributeNS(null, 'width', String(width))
    this.wrapper.setAttributeNS(null, 'height', String(height))
  }
}
