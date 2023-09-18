import { Term } from './Term'
import styles from './styles.module.css'
import { RequisiteType, VisualizationCourse } from './types'

export type Link = {
  course: Course
  type: RequisiteType
}

export class Course {
  term: Term
  index: number
  raw: VisualizationCourse

  forward: Link[] = []
  backward: Link[] = []

  wrapper: HTMLElement = Object.assign(document.createElement('div'), {
    className: styles.course
  })
  ball: HTMLElement = Object.assign(document.createElement('div'), {
    className: styles.courseBall
  })
  name: HTMLElement = Object.assign(document.createElement('div'), {
    className: styles.courseName
  })

  position = { x: 0, y: 0, radius: 0 }

  constructor (course: VisualizationCourse, term: Term, index: number) {
    this.term = term
    this.index = index
    this.raw = course

    this.ball.textContent = String(course.metrics.complexity ?? '')
    this.name.title = this.name.textContent =
      course.name +
      (course.nameSub ? `\n${course.nameSub}` : '') +
      (course.nameCanonical ? `\n(${course.nameCanonical})` : '')
    this.wrapper.append(this.ball, this.name)
  }

  measurePosition (): void {
    const { top, left, width, height } = this.ball.getBoundingClientRect()
    this.position = {
      x: left + width / 2,
      y: top + height / 2,
      radius: width / 2
    }
  }
}
