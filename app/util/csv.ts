export class CsvParser {
  separator: string
  #row: string[] = ['']
  #quoted = false
  #lastCharWasQuote = false

  constructor (separator = ',') {
    this.separator = separator
  }

  * accept (chunk: string): Generator<string[]> {
    for (const char of chunk) {
      if (this.#quoted) {
        if (char === '"') {
          this.#quoted = false
          this.#lastCharWasQuote = true
        } else {
          this.#row[this.#row.length - 1] += char
        }
      } else if (char === '"') {
        this.#quoted = true
        // Escaped quote
        if (this.#lastCharWasQuote) {
          this.#lastCharWasQuote = false
          this.#row[this.#row.length - 1] += '"'
        }
      } else if (char === this.separator) {
        this.#row.push('')
      } else if (char === '\r' || char === '\n') {
        // CR is considered a line ending. CR LF is considered a double line
        // break, so the empty this.#row is skipped.
        if (this.#row.length > 1 || this.#row[0] !== '') {
          yield this.#row
        }
        this.#row = ['']
      } else {
        this.#row[this.#row.length - 1] += char
      }
    }
  }

  * finish (): Generator<string[]> {
    if (this.#row.length > 1 || this.#row[0] !== '') {
      yield this.#row
    }
  }
}
