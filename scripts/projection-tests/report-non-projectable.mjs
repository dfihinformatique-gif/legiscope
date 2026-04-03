import { createProjectionHarness } from "./lib/harness.mjs"

const pjlId = process.argv[2] ?? "PRJLANR5L17B1906"

const harness = await createProjectionHarness()

try {
  const { orderedBlocks } = await harness.loadPjl(pjlId)
  const failures = []
  console.error(
    `[report-non-projectable] analysing ${orderedBlocks.length} blocks for ${pjlId}...`,
  )

  for (let index = 0; index < orderedBlocks.length; index += 1) {
    const block = orderedBlocks[index]
    if (index > 0 && index % 25 === 0) {
      console.error(
        `[report-non-projectable] progress ${index}/${orderedBlocks.length}`,
      )
    }
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
  }

  if (failures.length === 0) {
    console.log(`Aucune disposition non projetable détectée pour ${pjlId}.`)
    process.exit(0)
  }

  console.log(
    `Dispositions encore non projetables pour ${pjlId}: ${failures.length}\n`,
  )

  for (const failure of failures) {
    console.log(
      [
        `#${failure.order} - ${failure.pjlArticleLabel}`,
        `target=${failure.articleId}${failure.articleNum ? ` (num ${failure.articleNum})` : ""}`,
        failure.isSection ? "type=section" : "type=article",
        `directives=${failure.directiveKinds.length > 0 ? failure.directiveKinds.join(", ") : "none"}`,
        `reason=${failure.reason}`,
        `text=${failure.blockText.replace(/\s+/g, " ").trim()}`,
      ].join("\n"),
    )
    console.log("")
  }
} finally {
  await harness.cleanup()
}
