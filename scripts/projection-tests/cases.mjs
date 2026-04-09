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
    id: "article10-73-ii-2",
    description:
      "Article 10 - projection du 2 du II de l'article 73 avec sélecteurs spécifiques conservés",
    async run(harness) {
      const { blocks } = await harness.getBlocksForArticle({
        pjlId: PJL_ID,
        articleId: "LEGIARTI000051765352",
      })
      const block = blocks.find((candidate) =>
        candidate.blockText.startsWith("A. – Au 2 du II de l’article 73"),
      )
      assert.ok(block, "article10-73-ii-2: bloc PJL contextualisé introuvable.")
      const result = await harness.analyzeBlock({
        pjlId: PJL_ID,
        articleId: "LEGIARTI000051765352",
        block,
      })
      assert.equal(
        result.directives.length,
        8,
        "article10-73-ii-2: nombre de directives inattendu.",
      )
      assert.equal(
        result.projection.failures.length,
        0,
        "article10-73-ii-2: la projection du bloc échoue encore.",
      )
      const projectedHtml = result.projection.html
      assert.ok(projectedHtml, "article10-73-ii-2: HTML projeté introuvable.")
      assert.match(
        projectedHtml,
        /bg-red-50[^>]*>\s*risques résultant\s*<\/span>\s*<span[^>]*bg-green-50[^>]*>\s*aléas suivants\s*<\/span>/u,
        "article10-73-ii-2: le remplacement introductif n'apparaît pas en diff.",
      )
      assert.match(
        projectedHtml,
        /bg-red-50[^>]*>\s*L\. 361-4-1\s*<\/span>\s*<span[^>]*bg-green-50[^>]*>\s*L\. 361-4-2\s*<\/span>/u,
        "article10-73-ii-2: le renvoi vers L. 361-4-2 n'apparaît pas en diff.",
      )
      assert.match(
        projectedHtml,
        /bg-red-50[^>]*>\s*De\s*<\/span>\s*<span[^>]*bg-green-50[^>]*>\s*Apparition de\s*<\/span>/u,
        "article10-73-ii-2: la transformation du c) n'apparaît pas en diff.",
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
    id: "article5-220quinquies-delete",
    description:
      "Article 5 - suppression ciblée dans l'article 220 quinquies malgré HTML lié dégradé",
    async run(harness) {
      const result = await harness.projectArticle({
        pjlId: PJL_ID,
        articleId: "LEGIARTI000051765044",
        blockNeedle:
          "Au premier alinéa du I de l’article 220 quinquies, les mots : « ou qui a ouvert droit au crédit d’impôt prévu à l’article 220 quater » sont supprimés ;",
      })
      const projectedHtml = requireProjectedHtml(result, this.id)
      assert.ok(
        projectedHtml.includes("bg-red-50"),
        "article5-220quinquies-delete: aucune suppression rouge détectée.",
      )
      assert.ok(
        projectedHtml.includes("220 quater") &&
          projectedHtml.includes("line-through-diff"),
        "article5-220quinquies-delete: la portion supprimée n'est pas correctement balisée.",
      )
    },
  },
  {
    id: "article5-235terzd-replace",
    description:
      "Article 5 - remplacement ciblé dans l'article 235 ter ZD malgré sélecteur de portion non résolu",
    async run(harness) {
      const result = await harness.projectArticle({
        pjlId: PJL_ID,
        articleId: "LEGIARTI000051764916",
        blockNeedle:
          "Au 5° du II de l’article 235 ter ZD, les mots : « , 210 B et 220 quater » sont remplacés par les mots : « et 210 B » ;",
      })
      const projectedHtml = requireProjectedHtml(result, this.id)
      assert.ok(
        projectedHtml.includes("bg-red-50") &&
          projectedHtml.includes("220 quater"),
        "article5-235terzd-replace: la suppression attendue n'apparaît pas.",
      )
      assert.ok(
        projectedHtml.includes("bg-green-50") &&
          projectedHtml.includes("et 210 B"),
        "article5-235terzd-replace: le texte de remplacement n'apparaît pas.",
      )
    },
  },
  {
    id: "article5-l31279-table",
    description:
      "Article 5 - suppression de ligne et remplacement de montant dans le tableau de L. 312-79",
    async run(harness) {
      const result = await harness.projectArticle({
        pjlId: PJL_ID,
        articleId: "LEGIARTI000051214618",
        blockNeedle: "Au tableau du second alinéa de l’article L. 312-79",
      })
      const projectedHtml = requireProjectedHtml(result, this.id)
      assert.ok(
        projectedHtml.includes("Gazole B100") &&
          projectedHtml.includes("line-through-diff"),
        "article5-l31279-table: la ligne supprimée n'est pas signalée.",
      )
      assert.ok(
        projectedHtml.includes("bg-green-50") &&
          projectedHtml.includes("34,705"),
        "article5-l31279-table: le nouveau montant n'apparaît pas.",
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
    id: "article5-39ah-abrogation",
    description: "Article 5 - abrogation entière de l'article 39 AH",
    async run(harness) {
      const result = await harness.projectArticle({
        pjlId: PJL_ID,
        linkText: "article 39 AH",
      })
      assert.ok(
        result.currentHtml && result.currentHtml.trim().length > 0,
        "article5-39ah-abrogation: le texte en vigueur de départ est vide.",
      )
      assert.equal(
        result.projectedHtml,
        "",
        "article5-39ah-abrogation: l'article n'est pas entièrement abrogé.",
      )
      assert.equal(
        result.projectedText,
        "",
        "article5-39ah-abrogation: du texte subsiste après abrogation.",
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
    id: "article7-199undeciesb-insert-phrase",
    description:
      "Article 7 - insertion après une phrase sans cible textuelle explicite dans l'article 199 undecies B",
    async run(harness) {
      const { blocks } = await harness.getBlocksForArticle({
        pjlId: PJL_ID,
        articleId: "LEGIARTI000051202835",
      })
      const block = blocks.find((candidate) =>
        candidate.blockText.includes("ii) Après la troisième phrase"),
      )
      assert.ok(
        block,
        "article7-199undeciesb-insert-phrase: bloc PJL contextualisé introuvable.",
      )
      const result = await harness.analyzeBlock({
        pjlId: PJL_ID,
        articleId: "LEGIARTI000051202835",
        block,
      })
      const projectedHtml = result.projection.html
      assert.ok(
        projectedHtml,
        "article7-199undeciesb-insert-phrase: HTML projeté introuvable.",
      )
      assert.ok(
        projectedHtml.includes("bg-green-50") &&
          projectedHtml.includes(
            "La réduction d'impôt s'applique aux investissements consistant en l'acquisition de véhicules",
          ),
        "article7-199undeciesb-insert-phrase: la phrase insérée n'apparaît pas.",
      )
    },
  },
  {
    id: "article7-244quaterw-multi-replace",
    description:
      "Article 7 - remplacement multi-cible sous un item numérique introductif dans l'article 244 quater W",
    async run(harness) {
      const { blocks } = await harness.getBlocksForArticle({
        pjlId: PJL_ID,
        articleId: "LEGIARTI000051203023",
      })
      const block = blocks.find((candidate) =>
        candidate.blockText.includes("Aux a du 1° et au a du 2° du 4"),
      )
      assert.ok(
        block,
        "article7-244quaterw-multi-replace: bloc PJL contextualisé introuvable.",
      )
      const result = await harness.analyzeBlock({
        pjlId: PJL_ID,
        articleId: "LEGIARTI000051203023",
        block,
      })
      const projectedHtml = result.projection.html
      assert.ok(
        projectedHtml,
        "article7-244quaterw-multi-replace: HTML projeté introuvable.",
      )
      const projectedText = harness.htmlToText(projectedHtml)
      assert.ok(
        projectedHtml.includes("bg-red-50") &&
          projectedHtml.includes("bg-green-50"),
        "article7-244quaterw-multi-replace: le diff attendu n'est pas balisé.",
      )
      assert.ok(
        harness.countOccurrences(projectedText, "neuf ans") >= 2,
        "article7-244quaterw-multi-replace: les deux remplacements attendus n'apparaissent pas.",
      )
      assert.ok(
        (
          projectedHtml.match(
            /bg-red-50[^>]*>\s*cinq\s*<\/span>\s*<span[^>]*bg-green-50[^>]*>\s*neuf\s*<\/span>\s*ans/gu,
          ) ?? []
        ).length >= 2,
        "article7-244quaterw-multi-replace: les deux remplacements 'cinq' -> 'neuf' n'apparaissent pas en diff ciblé.",
      )
    },
  },
  {
    id: "article7-244quatery-compact-phrase",
    description:
      "Article 7 - résolution de phrase sous préfixes compacts dans l'article 244 quater Y",
    async run(harness) {
      const { blocks } = await harness.getBlocksForArticle({
        pjlId: PJL_ID,
        articleId: "LEGIARTI000048826464",
      })
      const block = blocks.find((candidate) =>
        candidate.blockText.includes("A la seconde phrase du 1° du 2 du A"),
      )
      assert.ok(
        block,
        "article7-244quatery-compact-phrase: bloc PJL contextualisé introuvable.",
      )
      const result = await harness.analyzeBlock({
        pjlId: PJL_ID,
        articleId: "LEGIARTI000048826464",
        block,
      })
      const projectedHtml = result.projection.html
      assert.ok(
        projectedHtml,
        "article7-244quatery-compact-phrase: HTML projeté introuvable.",
      )
      const projectedText = harness.htmlToText(projectedHtml)
      assert.ok(
        projectedHtml.includes("bg-red-50") &&
          projectedHtml.includes("bg-green-50"),
        "article7-244quatery-compact-phrase: le diff attendu n'est pas balisé.",
      )
      assert.ok(
        projectedText.includes("cinquième phrase"),
        "article7-244quatery-compact-phrase: la nouvelle référence n'apparaît pas.",
      )
      assert.ok(
        (
          projectedHtml.match(
            /bg-red-50[^>]*>\s*troisieme|bg-red-50[^>]*>\s*troisième/gu,
          ) ?? []
        ).length >= 1 &&
          (
            projectedHtml.match(
              /bg-green-50[^>]*>\s*cinquieme|bg-green-50[^>]*>\s*cinquième/gu,
            ) ?? []
          ).length >= 1,
        "article7-244quatery-compact-phrase: le remplacement 'troisième' -> 'cinquième' n'apparaît pas en diff.",
      )
    },
  },
  {
    id: "article7-quoted-links-do-not-create-targets",
    description:
      "Article 7 - les liens cités dans le texte de remplacement ne doivent pas créer de faux blocs ciblés",
    async run(harness) {
      const { blocks } = await harness.getBlocksForArticle({
        pjlId: PJL_ID,
        articleId: "LEGIARTI000051682572",
      })
      assert.equal(
        blocks.length,
        0,
        "article7-quoted-links-do-not-create-targets: un lien cité dans une citation crée encore un bloc de projection parasite.",
      )
    },
  },
  {
    id: "article8-199terdecies0a-split-bullets",
    description:
      "Article 8 - scission correcte des sous-puces d'action dans l'article 199 terdecies-0 A",
    async run(harness) {
      const { blocks } = await harness.getBlocksForArticle({
        pjlId: PJL_ID,
        articleId: "LEGIARTI000051213428",
      })
      const block = blocks.find((candidate) =>
        candidate.blockText.startsWith("A. – A l’article 199 terdecies"),
      )
      assert.ok(
        block,
        "article8-199terdecies0a-split-bullets: bloc PJL contextualisé introuvable.",
      )
      const result = await harness.analyzeBlock({
        pjlId: PJL_ID,
        articleId: "LEGIARTI000051213428",
        block,
      })
      const projectedHtml = result.projection.html
      assert.ok(
        projectedHtml,
        "article8-199terdecies0a-split-bullets: HTML projeté introuvable.",
      )
      const projectedText = harness.htmlToText(projectedHtml)
      assert.ok(
        projectedText.includes(
          "au plus tard le dernier jour du quarante-huitième mois",
        ),
        "article8-199terdecies0a-split-bullets: le remplacement de la seconde phrase est absent.",
      )
      assert.ok(
        projectedHtml.includes("bg-red-50") &&
          projectedHtml.includes("bg-green-50"),
        "article8-199terdecies0a-split-bullets: le diff attendu n'est pas balisé.",
      )
      assert.ok(
        projectedHtml.includes(
          ", et à hauteur de 100 % au plus tard le dernier jour du quinzième mois suivant",
        ),
        "article8-199terdecies0a-split-bullets: la portion supprimée n'apparaît pas dans le diff.",
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
