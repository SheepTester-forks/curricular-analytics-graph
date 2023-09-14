import { Course } from './Course'
import { VisualizationTerm } from './types'

export class Term {
  heading: HTMLElement = Object.assign(document.createElement('div'), {
    className: 'cag/term'
  })
  courses: Course[]

  constructor (term: VisualizationTerm) {
    this.heading.textContent = term.name
    this.courses = term.curriculum_items.map(item => new Course(item))
  }
}
