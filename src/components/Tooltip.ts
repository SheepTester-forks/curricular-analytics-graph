import styles from '../styles.module.css'
import { Course } from './Course'

export class Tooltip {
  wrapper = Object.assign(document.createElement('div'), {
    className: styles.tooltip
  })

  show<C, R> (course: Course<C, R>) {
    this.wrapper.classList.remove(styles.tooltipHidden)
  }

  hide () {
    this.wrapper.classList.add(styles.tooltipHidden)
  }
}
