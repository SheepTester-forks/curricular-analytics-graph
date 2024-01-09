/**
 * Simple and dumb CSV parser. Probably overengineered since it's dealing with
 * streams, but whatever.
 */
export async function * parseCsv (
  csv: ReadableStream<Uint8Array>,
  separator = ','
): AsyncGenerator<string[]> {
  const reader = csv.pipeThrough(new TextDecoderStream()).getReader()
  let row: string[] = ['']
  let quoted = false
  let lastCharWasQuote = false
  let result
  while (!(result = await reader.read()).done) {
    const { value } = result
    for (const char of value) {
      if (quoted) {
        if (char === '"') {
          quoted = false
          lastCharWasQuote = true
        } else {
          row[row.length - 1] += char
        }
      } else if (char === '"') {
        quoted = true
        // Escaped quote
        if (lastCharWasQuote) {
          lastCharWasQuote = false
          row[row.length - 1] += '"'
        }
      } else if (char === separator) {
        row.push('')
      } else if (char === '\r' || char === '\n') {
        // CR is considered a line ending. CR LF is considered a double line
        // break, so the empty row is skipped.
        if (row.length > 1 || row[0] !== '') {
          yield row
        }
        row = ['']
      } else {
        row[row.length - 1] += char
      }
    }
  }
  if (row.length > 1 || row[0] !== '') {
    yield row
  }
}
