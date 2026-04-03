import assert from "node:assert/strict"

const PJL_ID = "PRJLANR5L17B1906"

function requireProjectedText(result, label) {
  assert.ok(result.projectedText, `${label}: texte projeté introuvable.`)
  return result.projectedText
}

function requireProjectedHtml(result, label) {
  assert.ok(result.projectedHtml, `${label}: HTML projeté introuvable.`)
  return result.projectedHtml
}

export const projectionCases = [
  {
    id: "article10",
    description: "Article 10 - III bis après III et remplacement du A du IV",
    async run(harness) {
      const result = await harness.projectArticle({
        pjlId: PJL_ID,
        linkText:
          "article 10 de la loi n° 2025-127 du 14 février 2025 de finances pour 2025",
      })
      const projectedHtml = requireProjectedHtml(result, this.id)
      const paragraphs = harness.extractParagraphTexts(projectedHtml)
      const indexIIIbis = paragraphs.findIndex((paragraph) =>
        /^III\s+bis\b/i.test(paragraph),
      )
      const indexIV = paragraphs.findIndex((paragraph) =>
        /^IV\b/i.test(paragraph),
      )
      assert.ok(indexIIIbis >= 0, "article10: III bis introuvable.")
      assert.ok(indexIV >= 0, "article10: IV introuvable.")
      assert.ok(indexIIIbis < indexIV, "article10: III bis apparaît après IV.")
      const ivParagraph = paragraphs[indexIV] ?? ""
      assert.ok(
        harness
          .normalizeText(ivParagraph)
          .includes(harness.normalizeText("A. - L'article 224")),
        "article10: le remplacement du A du IV n'est pas visible.",
      )
    },
  },
  {
    id: "article15-l1241-14-retabli",
    description: "Article 15 - rétablissement du L. 1241-14",
    async run(harness) {
      const result = await harness.projectArticle({
        pjlId: PJL_ID,
        linkText: "article L. 1241-14",
      })
      const projectedHtml = requireProjectedHtml(result, this.id)
      assert.ok(
        harness
          .normalizeText(projectedHtml)
          .includes(
            harness.normalizeText(
              "11° Le produit de la majoration de la taxe régionale sur l'immatriculation des véhicules",
            ),
          ),
        "article15-l1241-14-retabli: le texte rétabli est absent.",
      )
      assert.ok(
        projectedHtml.includes("bg-green-50"),
        "article15-l1241-14-retabli: aucune insertion verte détectée.",
      )
    },
  },
  {
    id: "article15-2000a-delete",
    description:
      "Article 15 - suppression de deux références à l'article 200-0 A",
    async run(harness) {
      const result = await harness.projectArticle({
        pjlId: PJL_ID,
        linkText: "article 200-0 A",
      })
      const projectedText = requireProjectedText(result, this.id)
      assert.equal(
        harness.countOccurrences(projectedText, "199 quater F"),
        0,
        "article15-2000a-delete: 199 quater F est encore présent.",
      )
      assert.equal(
        harness.countOccurrences(projectedText, "199 vicies A"),
        0,
        "article15-2000a-delete: 199 vicies A est encore présent.",
      )
    },
  },
  {
    id: "article2-224",
    description:
      "Article 2 - version projetée de l'article 224 sans fuite depuis l'article 10",
    async run(harness) {
      const result = await harness.projectArticle({
        pjlId: PJL_ID,
        linkText: "article 224 du code général des impôts",
      })
      const projectedHtml = requireProjectedHtml(result, this.id)
      const projectedText = requireProjectedText(result, this.id)
      assert.ok(
        harness
          .normalizeText(projectedText)
          .includes(
            harness.normalizeText(
              "En cas de modification de la situation de famille du contribuable",
            ),
          ),
        "article2-224: l'insertion attendue est absente.",
      )
      assert.ok(
        !/\bIII\s+bis\b/i.test(projectedText),
        "article2-224: le contenu de l'article 10 fuit dans la projection.",
      )
      assert.ok(
        projectedHtml.includes("bg-green-50"),
        "article2-224: aucune insertion verte détectée.",
      )
    },
  },
  {
    id: "article36-tableau-46",
    description: "Article 36 - remplacement du tableau de l'article 46",
    async run(harness) {
      const result = await harness.projectArticle({
        pjlId: PJL_ID,
        linkText:
          "article 46 de la loi n° 2011-1977 du 28 décembre 2011 de finances pour 2012",
      })
      const projectedHtml = requireProjectedHtml(result, this.id)
      assert.ok(
        projectedHtml.includes("<table"),
        "article36-tableau-46: aucun tableau dans la projection.",
      )
      assert.ok(
        harness
          .normalizeText(harness.htmlToText(projectedHtml))
          .includes(harness.normalizeText("Agence de l'eau Adour-Garonne")),
        "article36-tableau-46: l'intitulé attendu est absent du tableau projeté.",
      )
      assert.ok(
        projectedHtml.includes("bg-green-50") &&
          projectedHtml.includes("bg-red-50"),
        "article36-tableau-46: le remplacement de tableau n'est pas balisé en diff.",
      )
    },
  },
  {
    id: "article4-48b",
    description: "Article 4 - insertion au IV A b)",
    async run(harness) {
      const result = await harness.projectArticle({
        pjlId: PJL_ID,
        linkText:
          "article 48 de la loi n° 2025-127 du 14 février 2025 de finances pour 2025",
        blockNeedle:
          "Au deuxième alinéa, après les mots : « inférieur à 1,1 milliard d’euros »",
      })
      const projectedHtml = requireProjectedHtml(result, this.id)
      assert.ok(
        harness
          .normalizeText(projectedHtml)
          .includes(
            harness.normalizeText(
              "et pour les redevables dont le chiffre d'affaires",
            ),
          ),
        "article4-48b: l'insertion attendue est absente.",
      )
      assert.ok(
        projectedHtml.includes("bg-green-50"),
        "article4-48b: aucune insertion verte détectée.",
      )
    },
  },
  {
    id: "article4-48b2",
    description: "Article 4 - insertion au IV B b)",
    async run(harness) {
      const result = await harness.projectArticle({
        pjlId: PJL_ID,
        linkText:
          "article 48 de la loi n° 2025-127 du 14 février 2025 de finances pour 2025",
        blockNeedle:
          "Au deuxième alinéa, après les mots : « inférieur à 3,1 milliards d’euros »",
      })
      const projectedHtml = requireProjectedHtml(result, this.id)
      assert.ok(
        harness
          .normalizeText(projectedHtml)
          .includes(
            harness.normalizeText(
              "et pour les redevables dont le chiffre d'affaires",
            ),
          ),
        "article4-48b2: l'insertion attendue est absente.",
      )
      assert.ok(
        projectedHtml.includes("bg-green-50"),
        "article4-48b2: aucune insertion verte détectée.",
      )
    },
  },
  {
    id: "article5-154bisa-delete",
    description:
      "Article 5 - suppression du second alinéa de l'article 154 bis A",
    async run(harness) {
      const result = await harness.projectArticle({
        pjlId: PJL_ID,
        linkText: "article 154 bis A",
      })
      assert.equal(
        harness.countOccurrences(
          requireProjectedText(result, this.id),
          "Les indemnités journalières",
        ),
        0,
        "article5-154bisa-delete: l'alinéa supprimé est encore présent.",
      )
    },
  },
  {
    id: "article5-199quaterf",
    description: "Article 5 - remplacement de 199 quater F par 199 septies",
    async run(harness) {
      const result = await harness.projectArticle({
        pjlId: PJL_ID,
        linkText: "article 200 undecies",
      })
      const projectedHtml = requireProjectedHtml(result, this.id)
      assert.ok(
        projectedHtml.includes("bg-red-50") &&
          projectedHtml.includes("199 quater F"),
        "article5-199quaterf: 199 quater F n'apparaît pas en suppression.",
      )
      assert.ok(
        projectedHtml.includes("bg-green-50") &&
          projectedHtml.includes("199 septies"),
        "article5-199quaterf: 199 septies n'apparaît pas en insertion.",
      )
    },
  },
  {
    id: "article5-25",
    description: "Article 5 - insertion du III à l'article 1395 B bis",
    async run(harness) {
      const result = await harness.projectArticle({
        pjlId: PJL_ID,
        linkText: "article 1395 B bis",
      })
      assert.ok(
        harness.countOccurrences(
          requireProjectedText(result, this.id),
          "III.",
        ) > harness.countOccurrences(result.currentText, "III."),
        "article5-25: l'insertion du III n'est pas visible.",
      )
      assert.ok(
        requireProjectedHtml(result, this.id).includes("bg-green-50"),
        "article5-25: aucune insertion verte détectée.",
      )
    },
  },
  {
    id: "article5-81-abrogations",
    description: "Article 5 - abrogations ciblées sur l'article 81",
    async run(harness) {
      const result = await harness.projectArticle({
        pjlId: PJL_ID,
        articleId: "LEGIARTI000051765336",
      })
      assert.ok(
        result.projection.html !== null && result.projection.appliedCount > 0,
        "article5-81-abrogations: aucune disposition n'a pu être appliquée.",
      )
    },
  },
  {
    id: "article6-157bis-delete",
    description:
      "Article 6 - suppression phrase + seconde virgule à l'article 157 bis",
    async run(harness) {
      const result = await harness.projectArticle({
        pjlId: PJL_ID,
        linkText: "article 157 bis",
      })
      const projectedHtml = requireProjectedHtml(result, this.id)
      assert.ok(
        projectedHtml.includes("bg-red-50") &&
          projectedHtml.includes(
            "âgé de plus de soixante-cinq ans au 31 décembre de l'année d'imposition, ou",
          ),
        "article6-157bis-delete: la phrase supprimée n'apparaît pas en rouge.",
      )
      assert.ok(
        /bg-red-50[^>]*>\s*,\s*<\/span>/u.test(projectedHtml),
        "article6-157bis-delete: la seconde virgule n'apparaît pas en suppression.",
      )
    },
  },
  {
    id: "article6-158",
    description: "Article 6 - projection de l'article 158",
    async run(harness) {
      const result = await harness.projectArticle({
        pjlId: PJL_ID,
        linkText: "article 158",
      })
      const projectedHtml = requireProjectedHtml(result, this.id)
      const projectedText = requireProjectedText(result, this.id)
      assert.ok(
        harness
          .normalizeText(projectedText)
          .includes(harness.normalizeText("a bis)")),
        "article6-158: le a bis inséré est absent.",
      )
      assert.ok(
        harness
          .normalizeText(projectedText)
          .includes(
            harness.normalizeText("a bis pour les prestations de retraites"),
          ),
        "article6-158: l'ajout sur le b bis est absent.",
      )
      assert.ok(
        (projectedHtml.match(/bg-red-50[^>]*>et retraites<\/span>/gu) ?? [])
          .length >= 2,
        "article6-158: les suppressions de 'et retraites' n'apparaissent pas en rouge.",
      )
      assert.ok(
        projectedHtml.includes("bg-green-50") &&
          projectedHtml.includes("bg-red-50"),
        "article6-158: les insertions/suppressions attendues ne sont pas balisées.",
      )
    },
  },
  {
    id: "lpfp-no-projection",
    description: "Référence simple LPFP - pas de version projetée",
    async run(harness) {
      const targetId = await harness.resolveArticleId({
        pjlId: PJL_ID,
        linkText:
          "la loi de programmation des finances publiques pour les années 2023 à 2027",
      })
      const articleInfo = await harness.getArticleInfo(PJL_ID, targetId)
      const articleId = articleInfo?.article?.legi_id ?? targetId
      const { blocks } = await harness.getBlocksForArticle({
        pjlId: PJL_ID,
        articleId,
      })
      assert.equal(
        blocks.length,
        0,
        "lpfp-no-projection: des blocs projetables ont été détectés à tort.",
      )
    },
  },
  {
    id: "section-x-retabli",
    description: "Article 1 - section X rétablie dans le CGI",
    async run(harness) {
      const result = await harness.projectArticle({
        pjlId: PJL_ID,
        linkText: "chapitre III du titre Ier de la première partie",
        isSection: true,
      })
      const projectedHtml = requireProjectedHtml(result, this.id)
      assert.ok(
        harness
          .normalizeText(projectedHtml)
          .includes(harness.normalizeText("Section X")),
        "section-x-retabli: la section X n'apparaît pas dans la projection.",
      )
      assert.ok(
        projectedHtml.includes("bg-green-50"),
        "section-x-retabli: aucune insertion verte détectée.",
      )
    },
  },
]
