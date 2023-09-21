import { Course } from './Course'
import styles from '../styles.module.css'
import { VisualizationTerm } from '../types'

export class Term {
  index: number
  courses: Course[]

  heading: HTMLElement = Object.assign(document.createElement('div'), {
    className: styles.termHeading,
    role: 'columnheader'
  })
  footer: HTMLElement = Object.assign(document.createElement('div'), {
    className: styles.termFooter
  })

  constructor (term: VisualizationTerm, index: number) {
    this.index = index
    this.courses = term.curriculum_items.map(
      (item, i) => new Course(item, this, i)
    )

    this.heading.textContent = term.name
    this.footer.textContent = `Complexity: ${term.curriculum_items.reduce(
      (acc, curr) => acc + (curr.metrics.complexity ?? 0),
      0
    )}`
  }
}
