export type Course<T> = {
  element: HTMLElement
  course: T
  blockingFactor: number
  delayFactor: number
  complexity: number
  centrality: number
}
export type Link<T> = {
  source: Course<T>
  target: Course<T>
  element: SVGPathElement
  redundant: boolean
}
