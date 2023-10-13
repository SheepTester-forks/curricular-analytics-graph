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
  }

  show (course: Course<C, R>) {
    this.#course = course
    this.wrapper.classList.remove(styles.tooltipHidden)
    this.#title.textContent = this.#options.tooltipTitle(course.raw)
    this.#table.join(this.#options.tooltipContent(course.raw))
    this.#reqs.join(course.backward)
  }

  hide () {
    this.wrapper.classList.add(styles.tooltipHidden)
  }
}
