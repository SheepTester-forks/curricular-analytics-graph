import { readFile, writeFile } from 'fs/promises'

/** Percentage to add/subtract from real value */
const FUZZ_RANGE = 0.03

function fuzz (data, mapFn = n => n) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      mapFn(value * (1 + (Math.random() * 2 - 1) * FUZZ_RANGE))
    ])
  )
}

await writeFile(
  './app/data/fuzzed-dfw.json',
  JSON.stringify(
    fuzz(
      JSON.parse(
        await readFile(
          '../curricular-analytics-exploration/files/protected/summarize_dfw.json',
          'utf-8'
        )
      )
    )
  ) + '\n'
)
await writeFile(
  './app/data/fuzzed-waitlist.json',
  JSON.stringify(
    fuzz(
      JSON.parse(
        await readFile(
          '../curricular-analytics-exploration/files/protected/summarize_waitlist.json',
          'utf-8'
        )
      ),
      Math.round
    )
  ) + '\n'
)
