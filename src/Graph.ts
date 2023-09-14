import { Term } from './Term'
import { VisualizationCurriculum } from './types'

export class Graph {
  wrapper: HTMLElement = Object.assign(document.createElement('div'), {
    className: 'cag/graph-wrapper'
  })
  #terms: Term[] = []

  constructor (curriculum?: VisualizationCurriculum) {
    if (curriculum) {
      this.setCurriculum(curriculum)
    }
  }

  setCurriculum (curriculum: VisualizationCurriculum): void {
    // Remove all elements
    while (this.wrapper.firstChild) {
      this.wrapper.removeChild(this.wrapper.firstChild)
    }

    this.#terms = []
    for (const termDatum of curriculum.curriculum_terms) {
      const term = new Term(termDatum)
      this.#terms.push(term)
      this.wrapper.append(term.heading)
      for (const course of term.courses) {
        this.wrapper.append(course.wrapper)
      }
    }
  }
}
