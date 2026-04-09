import { performance } from "node:perf_hooks"

const startedAt = performance.now()

await import(new URL("../projection-tests/run-all.mjs", import.meta.url).href)
await import(new URL("./run-dom.mjs", import.meta.url).href)
await import(new URL("./run-preview-scroll.mjs", import.meta.url).href)

const durationMs = Math.round(performance.now() - startedAt)
console.log(`\n[tests] full suite passed in ${durationMs} ms.`)
