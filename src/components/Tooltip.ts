import styles from '../styles.module.css'
import { Join } from '../util/Join'
import { Course, CourseLink } from './Course'

export type TooltipOptions<C, R> = {
  tooltipTitle: (course: C) => string
  tooltipContent: (course: C) => [string, string][]
  tooltipRequisiteInfo: (
    element: HTMLElement,
    link: R & { source: C; target: C }
  ) => void
}

export class Tooltip<C, R> {
  #options: TooltipOptions<C, R>
  #course: Course<C, R> | null = null
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
  #reqs = new Join<CourseLink<C, R>, HTMLLIElement>({
    wrapper: Object.assign(document.createElement('ul'), {
      className: styles.tooltipReqs
    }),
    key: link => link.course.id,
    enter: () => {
      return Object.assign(document.createElement('li'), {
        className: styles.tooltipReq
      })
    },
    update: (link, element) => {
      if (this.#course) {
        this.#options.tooltipRequisiteInfo(element, {
          ...link.raw,
          source: link.course.raw,
          target: this.#course.raw
        })
      }
    }
  })

  constructor (options: TooltipOptions<C, R>) {
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

  show (course: Course<C, R>): void {
    this.#course = course
    this.wrapper.classList.remove(styles.tooltipHidden)
    this.#title.textContent = this.#options.tooltipTitle(course.raw)
    this.#table.join(this.#options.tooltipContent(course.raw))
    this.#reqs.join(course.backward)
    this.position()
  }

  position (): void {
    if (!this.#course) {
      return
    }
    const TOOLTIP_PADDING = 10
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    const left = Math.min(
      Math.max(this.#course.position.x - this.#width / 2, TOOLTIP_PADDING),
      windowWidth - this.#width - TOOLTIP_PADDING
    )
    this.wrapper.style.left = `${left}px`
    this.wrapper.style.setProperty(
      '--left',
      `${this.#course.position.x - left}px`
    )
    const bottom =
      this.#course.position.y + this.#course.position.radius + this.#height
    if (bottom < windowHeight) {
      this.wrapper.style.top = `${
        this.#course.position.y + this.#course.position.radius
      }px`
      this.wrapper.style.bottom = ''
      this.wrapper.classList.add(styles.tooltipTop)
      this.wrapper.classList.remove(styles.tooltipBottom)
    } else {
      this.wrapper.style.top = ''
      this.wrapper.style.bottom = `${
        windowHeight - (this.#course.position.y - this.#course.position.radius)
      }px`
      this.wrapper.classList.remove(styles.tooltipTop)
      this.wrapper.classList.add(styles.tooltipBottom)
    }
  }

  hide (): void {
    this.wrapper.classList.add(styles.tooltipHidden)
  }
}
