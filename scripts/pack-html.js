import { readFile, writeFile } from 'fs/promises'

const html = await readFile('./dist/index.html', 'utf-8')
const css = await readFile('./dist/index.css', 'utf-8')
const js = await readFile('./dist/index.js', 'utf-8')
await writeFile(
  './dist/plan-graph.html',
  html
    .replace(
      '<link rel="stylesheet" href="./index.css" />',
      () => `<style>${css}</style>`
    )
    .replace(
      '<script src="./index.js" type="module"></script>',
      () =>
        `<script type="module">${js.replaceAll(
          '</script>',
          '</\\u{73}cript>'
        )}</script>`
    )
)
