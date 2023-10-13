import styles from '../styles.module.css'
import { Join } from '../util/Join'
import { Course } from './Course'

export class Tooltip {
  wrapper = Object.assign(document.createElement('div'), {
    className: styles.tooltip
  })
  table = new Join<[string, string], HTMLTableRowElement>({
    wrapper: Object.assign(document.createElement('table'), {
      className: styles.tooltipTable
    }),
    key: ([key]) => key,
    enter: ([key, value]) => {
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
          className: styles.tooltipValue,
          textContent: value,
          scope: 'row'
        })
      )
      return row
    },
    update: ([, value], row) => {
      row.children[1].textContent = value
    }
  })

  constructor () {
    this.wrapper.append(
      this.table.wrapper,
      Object.assign(document.createElement('h2'), {
        className: styles.tooltipReqHeading,
        textContent: 'Requisites'
      })
    )
  }

  show<C, R> (course: Course<C, R>) {
    this.wrapper.classList.remove(styles.tooltipHidden)
  }

  hide () {
    this.wrapper.classList.add(styles.tooltipHidden)
  }
}
