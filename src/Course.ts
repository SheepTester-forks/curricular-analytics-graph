import { VisualizationCourse } from './types'

export class Course {
  wrapper: HTMLElement = Object.assign(document.createElement('div'), {
    className: 'cag/course-wrapper'
  })
  ball: HTMLElement = Object.assign(document.createElement('div'), {
    className: 'cag/course-ball'
  })
  name: HTMLElement = Object.assign(document.createElement('div'), {
    className: 'cag/course-name'
  })

  constructor (course: VisualizationCourse) {
    this.ball.textContent = String(course.metrics.complexity ?? '')
    this.name.textContent =
      course.name +
      (course.nameSub ? `\n${course.nameSub}` : '') +
      (course.nameCanonical ? `\n(${course.nameCanonical})` : '')
    this.wrapper.append(this.ball, this.name)
  }
}
