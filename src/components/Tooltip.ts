import styles from '../styles.module.css'
import { Course } from '../types'
import { Join } from '../util/Join'
import { CourseNode } from './CourseNode'

export type TooltipOptions<T> = {
  tooltipTitle: (course: CourseNode<T>) => string
  tooltipContent: (course: CourseNode<T>) => [string, string][]
  tooltipRequisiteInfo: (
    element: HTMLElement,
    source: Course<T>,
    target: Course<T>
  ) => void
}

export class Tooltip<T> {
  #options: TooltipOptions<T>
  #node: CourseNode<T> | null = null
  #width = 0
  #height = 0

  wrapper = Object.assign(document.createElement('div'), {
    className: styles.tooltip
  })
  #title = Object.assign(document.createElement('h1'), {
    className: styles.tooltipTitle
  })
  #table = new Join<[string, string], HTMLTableRowElement>({
    wrapper: Object.assign(document.createElement('table'), {
      className: styles.tooltipTable
    }),
    key: ([key]) => key,
    enter: ([key]) => {
      const row = Object.assign(document.createElement('tr'), {
        className: styles.tooltipRow
      })
      row.append(
        Object.assign(document.createElement('th'), {
          className: styles.tooltipKey,
          textContent: key,
          scope: 'row'
        }),
        Object.assign(document.createElement('td'), {
          className: styles.tooltipValue
        })
      )
      return row
    },
    update: ([, value], row) => {
      row.children[1].textContent = value
    }
  })
  #reqs = new Join<CourseNode<T>, HTMLLIElement>({
    wrapper: Object.assign(document.createElement('ul'), {
      className: styles.tooltipReqs
    }),
    key: source => source.id,
    enter: () => {
      return Object.assign(document.createElement('li'), {
        className: styles.tooltipReq
      })
    },
    update: (source, element) => {
      if (this.#node) {
        this.#options.tooltipRequisiteInfo(element, source, this.#node)
      }
    }
  })

  constructor (options: TooltipOptions<T>) {
    this.#options = options
    this.wrapper.append(
      this.#title,
      this.#table.wrapper,
      Object.assign(document.createElement('h2'), {
        className: styles.tooltipReqHeading,
        textContent: 'Requisites'
      }),
      this.#reqs.wrapper
    )
    this.hide()

    new ResizeObserver(([{ contentBoxSize }]) => {
      const [{ blockSize, inlineSize }] = contentBoxSize
      this.#width = inlineSize
      this.#height = blockSize
      this.position()
    }).observe(this.wrapper)
  }

  show (node: CourseNode<T>, backwards: CourseNode<T>[]): void {
    this.#node = node
    this.wrapper.classList.remove(styles.tooltipHidden)
    this.#title.textContent = this.#options.tooltipTitle(node)
    this.#table.join(this.#options.tooltipContent(node))
    this.#reqs.join(backwards)
    this.position()
  }

  static #TOOLTIP_PADDING_X = 10
  static #TOOLTIP_PADDING_Y = 25

  position (): void {
    if (!this.#node) {
      return
    }
    const courseRect = this.#node.ball.getBoundingClientRect()
    const courseX = courseRect.left + courseRect.width / 2
    const courseY = courseRect.top + courseRect.height / 2
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    const left = Math.min(
      Math.max(courseX - this.#width / 2, Tooltip.#TOOLTIP_PADDING_X),
      windowWidth - this.#width - Tooltip.#TOOLTIP_PADDING_X
    )
    this.wrapper.style.left = `${left}px`
    this.wrapper.style.setProperty('--left', `${courseX - left}px`)
    const bottom = courseY + this.#node.position.radius + this.#height
    if (bottom <= windowHeight - Tooltip.#TOOLTIP_PADDING_Y) {
      this.wrapper.style.top = `${courseY + this.#node.position.radius}px`
      this.wrapper.style.bottom = ''
      this.wrapper.classList.add(styles.tooltipTop)
      this.wrapper.classList.remove(styles.tooltipBottom)
    } else {
      this.wrapper.style.top = ''
      this.wrapper.style.bottom = `${
        windowHeight - (courseY - this.#node.position.radius)
      }px`
      this.wrapper.classList.remove(styles.tooltipTop)
      this.wrapper.classList.add(styles.tooltipBottom)
    }
  }

  hide (): void {
    this.wrapper.classList.add(styles.tooltipHidden)
  }
}
