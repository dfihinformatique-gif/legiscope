import { createProjectionHarness } from "./lib/harness.mjs"

const pjlId = process.argv[2] ?? "PRJLANR5L17B1906"
const limit = Number(process.argv[3] ?? "1")

const harness = await createProjectionHarness()

try {
  const { orderedBlocks } = await harness.loadPjl(pjlId)
  const failures = []

  for (let index = 0; index < orderedBlocks.length; index += 1) {
    const block = orderedBlocks[index]
    const isSection = block.articleId.startsWith("LEGISCTA")
    const analysis = await harness.analyzeBlock({
      pjlId,
      articleId: block.articleId,
      block,
      isSection,
    })

    if (!analysis.isAction) continue
    if (analysis.projection.html !== null) continue

    failures.push({
      order: index + 1,
      pjlArticleLabel: block.pjlArticleLabel,
      articleId: block.articleId,
      articleNum: block.articleNum ?? null,
      isSection,
      directiveKinds: analysis.directives.map((directive) => directive.kind),
      reason:
        analysis.projection.failures[0]?.reason ??
        analysis.projection.reason ??
        "Echec de projection sans raison explicite.",
      blockText: block.blockText,
    })
    if (failures.length >= limit) break
  }

  console.log(
    JSON.stringify(
      failures.length > 0
        ? failures
        : {
            pjlId,
            message: "Aucune disposition non projetable détectée.",
          },
      null,
      2,
    ),
  )
} finally {
  await harness.cleanup()
}
