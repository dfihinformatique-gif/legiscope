import { readdir } from "node:fs/promises"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

const root = resolve(process.cwd(), "scripts", "ui-tests")
const entries = await readdir(root, { withFileTypes: true })
const tests = entries
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => name.endsWith(".mjs"))
  .filter((name) => name !== "run-all.mjs")
  .sort()

if (tests.length === 0) {
  console.log("No UI tests found in scripts/ui-tests.")
  process.exit(0)
}

for (const test of tests) {
  const file = join(root, test)
  console.log(`\n[ui-tests] running ${test}`)
  try {
    await import(pathToFileURL(file).href)
  } catch (error) {
    console.error(`[ui-tests] failed ${test}`)
    console.error(error)
    process.exit(1)
  }
}

console.log(`\n[ui-tests] all tests passed (${tests.length}).`)
