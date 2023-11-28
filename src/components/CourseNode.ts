import styles from '../styles.module.css'
import { Course } from '../types'

export class CourseNode<T> implements Course<T> {
  static #id = 0
  /** Guaranteed to be nonzero. */
  id: number

  term: number
  index: number
  course: T
  blockingFactor: number
  delayFactor: number
  complexity: number
  centrality: number

  wrapper: HTMLElement = Object.assign(document.createElement('div'), {
    className: styles.course
  })
  ball: HTMLElement = Object.assign(document.createElement('button'), {
    className: styles.courseBall
  })
  ballLabel = document.createTextNode('')
  name: HTMLElement = Object.assign(document.createElement('div'), {
    className: styles.courseName
  })

  position = { x: 0, y: 0, radius: 0 }

  constructor (
    course: T,
    term: number,
    index: number,
    {
      blockingFactor,
      delayFactor,
      complexity,
      centrality
    }: Omit<Course<T>, 'course' | 'element'>
  ) {
    this.id = ++CourseNode.#id
    this.term = term
    this.index = index
    this.course = course
    this.blockingFactor = blockingFactor
    this.delayFactor = delayFactor
    this.complexity = complexity
    this.centrality = centrality

    this.ball.append(this.ballLabel)
    this.wrapper.append(this.ball, this.name)
  }

  measurePosition (parent: DOMRect): void {
    const { top, left, width, height } = this.ball.getBoundingClientRect()
    this.position = {
      x: left + width / 2 - parent.left,
      y: top + height / 2 - parent.top,
      radius: width / 2
    }
  }

  get element () {
    return this.ball
  }
}
