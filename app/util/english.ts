/**
 * @example
 * displayList(['A', 'B', 'C'], 'and') // 'A, B, and C'
 */
export function displayList (
  strings: string[],
  separator: string,
  empty = 'none'
): string {
  if (strings.length === 0) {
    return empty
  }
  if (strings.length === 1) {
    return strings[0]
  }
  if (strings.length === 2) {
    return strings.join(` ${separator} `)
  }
  return `${strings.slice(0, -1).join(', ')}, ${separator} ${strings.at(-1)}`
}
