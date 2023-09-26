export type Key = string | number | symbol

export type JoinOptions<T, E> = {
  /**
   * Ignores all existing elements not created by `enter`.
   */
  wrapper: Element
  /**
   * Ideally should be unique per datum, but this is not required. If there are
   * duplicate keys, then `update` calls might mix up different data with the
   * same key if they're reordered.
   */
  key: (datum: T) => Key
  enter: (datum: T) => E
  /**
   * Called for every new and existing datum. `oldDatum` is null if the datum is
   * new. `oldDatum` may be the same as `newDatum`.
   */
  update?: (newDatum: T, element: E, oldDatum: T | null) => void
  /** Called before `element` is removed. */
  exit?: (datum: T, element: E) => void
}

type Entry<T, E> = {
  key: Key
  datum: T
  element: E
}

export class Join<T, E extends Element> {
  wrapper: Element
  #entries: Entry<T, E>[] = []
  #key: (datum: T) => Key
  #enter: (datum: T) => E
  #update: (newDatum: T, element: E, oldDatum: T | null) => void
  #exit: (datum: T, element: E) => void

  constructor ({
    wrapper,
    key,
    enter,
    update = () => {},
    exit = () => {}
  }: JoinOptions<T, E>) {
    this.wrapper = wrapper
    this.#key = key
    this.#enter = enter
    this.#update = update
    this.#exit = exit
  }

  join (data: T[]): void {
    const oldEntries = this.#entries
    const newEntries: Entry<T, E>[] = []
    for (const datum of data) {
      const key = this.#key(datum)
      const index = oldEntries.findIndex(entry => entry.key === key)
      if (index === -1) {
        const element = this.#enter(datum)
        newEntries.push({ key, datum, element })
        this.#update(datum, element, null)
      } else {
        const entry = oldEntries[index]
        newEntries.push({ ...entry, datum })
        this.#update(datum, entry.element, entry.datum)
      }
    }
    // Remove removed elements
    for (const { datum, element } of oldEntries) {
      this.#exit(datum, element)
      element.remove()
    }
    // Update order of elements
    this.wrapper.append(newEntries[0].element)
    for (const [i, { element }] of newEntries.slice(0, -1).entries()) {
      element.after(newEntries[i + 1].element)
    }
    this.#entries = newEntries
  }
}
