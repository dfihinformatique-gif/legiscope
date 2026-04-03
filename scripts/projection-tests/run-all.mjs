import { performance } from "node:perf_hooks"

import { projectionCases } from "./cases.mjs"
import { createProjectionHarness } from "./lib/harness.mjs"

const harness = await createProjectionHarness()
const startedAt = performance.now()

try {
  for (const testCase of projectionCases) {
    const caseStart = performance.now()
    console.log(`\n[projection-tests] running ${testCase.id}`)
    await testCase.run(harness)
    const durationMs = Math.round(performance.now() - caseStart)
    console.log(`OK - ${testCase.description} (${durationMs} ms)`)
  }
  const durationMs = Math.round(performance.now() - startedAt)
  console.log(
    `\n[projection-tests] all tests passed (${projectionCases.length}) in ${durationMs} ms.`,
  )
} finally {
  await harness.cleanup()
}
