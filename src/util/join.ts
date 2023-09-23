export type JoinOptions<T, E> = {
  key: (datum: T) => string | number
  enter: (datum: T) => E
  update?: (datum: T, element: E) => void
  exit?: (datum: T, element: E) => void
}

export class Join<T, E extends Element> {
  #key: (datum: T) => string | number
  #enter: (datum: T) => E
  #update: (datum: T, element: E) => void
  #exit: (datum: T, element: E) => void

  constructor (options: JoinOptions<T, E>) {
    this.#key = options.key
    this.#enter = options.enter
    this.#update = options.update ?? (() => {})
    this.#exit = options.exit ?? ((_, element) => element.remove())
  }

  join (data: T[]): void {
    //
  }
}
