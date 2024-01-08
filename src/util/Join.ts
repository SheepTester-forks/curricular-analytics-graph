export type Key = string | number | symbol

export type MeasureOptions<T, E> = {
  getParentRect: () => DOMRect
  measureChild: (datum: T, element: E, parentRect: DOMRect) => void
}
export type JoinOptions<W, T, E> = {
  /**
   * Ignores all existing elements not created by `enter`.
   */
  wrapper: W
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
  /**
   * Optional. This allows measurement of the element (such as its bounding client rect) to store the results in `datum`.
   */
  measure?: MeasureOptions<T, E>
}

type Entry<T, E> = {
  key: Key
  datum: T
  element: E
}

export class Join<T, E extends Element, W extends Element = HTMLElement> {
  wrapper: W
  #entries: Entry<T, E>[] = []
  #key: (datum: T) => Key
  #enter: (datum: T) => E
  #update: (newDatum: T, element: E, oldDatum: T | null) => void
  #exit: (datum: T, element: E) => void
  #measure?: MeasureOptions<T, E>

  constructor ({
    wrapper,
    key,
    enter,
    update = () => {},
    exit = () => {},
    measure
  }: JoinOptions<W, T, E>) {
    this.wrapper = wrapper
    this.#key = key
    this.#enter = enter
    this.#update = update
    this.#exit = exit
    this.#measure = measure
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
    if (newEntries.length > 0) {
      this.wrapper.append(newEntries[0].element)
      for (const [i, { element }] of newEntries.slice(0, -1).entries()) {
        element.after(newEntries[i + 1].element)
      }
    }
    this.#entries = newEntries
  }

  /** Calls `update` on every existing datum. */
  forceUpdate (): void {
    for (const { datum, element } of this.#entries) {
      this.#update(datum, element, datum)
    }
  }

  /** Calls `measure` on every datum. */
  measure (): void {
    if (!this.#measure) {
      return
    }
    const { getParentRect, measureChild } = this.#measure
    const parentRect = getParentRect()
    for (const { datum, element } of this.#entries) {
      measureChild(datum, element, parentRect)
    }
  }
}
