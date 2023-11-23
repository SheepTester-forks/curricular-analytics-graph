import styles from '../styles.module.css'

export class Course<T> {
  static #id = 0
  /** Guaranteed to be nonzero. */
  id: number

  term: number
  index: number
  raw: T

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

  constructor (course: T, term: number, index: number) {
    this.id = ++Course.#id
    this.term = term
    this.index = index
    this.raw = course

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
}
