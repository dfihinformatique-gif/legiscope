import fs from "node:fs/promises"

import { parseHTML } from "linkedom"
import { createServer } from "vite"

function normalizeText(value) {
  return (value ?? "")
    .replace(/[’]/g, "'")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0
  const source = normalizeText(haystack)
  const target = normalizeText(needle)
  if (!source || !target) return 0
  let count = 0
  let index = 0
  while (true) {
    const next = source.indexOf(target, index)
    if (next === -1) return count
    count += 1
    index = next + target.length
  }
}

function htmlToText(html) {
  const { document } = parseHTML(`<div id="root">${html}</div>`)
  return document.getElementById("root")?.textContent ?? ""
}

function extractParagraphTexts(html) {
  const { document } = parseHTML(`<div id="root">${html}</div>`)
  const paragraphs = []
  const root = document.getElementById("root")

  function walk(node) {
    if (node.nodeType !== 1) return
    if (node.localName === "p") {
      paragraphs.push((node.textContent ?? "").replace(/\s+/g, " ").trim())
    }
    for (const child of node.childNodes) {
      walk(child)
    }
  }

  if (root) {
    walk(root)
  }
  return paragraphs
}

function walkElements(node, visit) {
  if (node.nodeType !== 1) return
  visit(node)
  for (const child of node.childNodes) {
    walkElements(child, visit)
  }
}

function createRootAdapter(document, pjlId) {
  const paragraphNodes = []
  const lawLinks = []
  const linkEntries = []

  walkElements(document.documentElement, (node) => {
    if (["p", "li", "table"].includes(node.localName)) {
      paragraphNodes.push(node)
    }

    if (node.localName !== "a") return
    const className = node.getAttribute("class") ?? ""
    const href = node.getAttribute("href") ?? ""
    const match = href.match(
      /\/legifrance\/(?:sections|articles|textes)\/([^"?#]+)/,
    )
    if (!/lien_(article|division|texte)_externe/.test(className) || !match) {
      return
    }

    const articleId = match[1].replace(/\.md$/u, "")
    node.setAttribute("class", "law-article-link")
    node.setAttribute("href", `/pjl/${pjlId}?article=${articleId}`)
    lawLinks.push(node)
    linkEntries.push({
      articleId,
      text: (node.textContent ?? "").replace(/\s+/g, " ").trim(),
    })
  })

  return {
    rootAdapter: {
      querySelectorAll(selector) {
        if (selector === "p, li, table") return paragraphNodes
        if (selector === "a.law-article-link") return lawLinks
        return []
      },
    },
    linkEntries,
    Element: document.defaultView?.Element,
  }
}

export async function createProjectionHarness() {
  const viteServer = await createServer({
    server: { hmr: false, middlewareMode: true },
    appType: "custom",
  })

  const [
    billPreviewModule,
    blockDirectivesModule,
    projectionModule,
    pageServerModule,
    dbConnectModule,
    pjlDatesModule,
  ] = await Promise.all([
    viteServer.ssrLoadModule("/src/lib/pjl/bill_preview.ts"),
    viteServer.ssrLoadModule("/src/lib/pjl/block_directives.ts"),
    viteServer.ssrLoadModule("/src/lib/pjl/projection.ts"),
    viteServer.ssrLoadModule("/src/routes/pjl/[pjl]/+page.server.ts"),
    viteServer.ssrLoadModule("/src/lib/server/db-connect.ts"),
    viteServer.ssrLoadModule("/src/lib/pjl/pjl_dates.ts"),
  ])

  const pjlCache = new Map()
  const articleInfoCache = new Map()

  async function loadPjl(pjlId) {
    if (pjlCache.has(pjlId)) {
      return pjlCache.get(pjlId)
    }

    const rawHtml = await fs.readFile(`static/${pjlId}.html`, "utf8")
    const { document } = parseHTML(rawHtml)
    const { rootAdapter, linkEntries, Element } = createRootAdapter(
      document,
      pjlId,
    )

    globalThis.window = { location: { origin: "http://localhost" } }
    if (Element) {
      globalThis.Element = Element
    }

    const blocksByArticle = billPreviewModule.buildPjlArticleBlocks(rootAdapter)
    const entry = {
      pjlId,
      rawHtml,
      blocksByArticle,
      linkEntries,
      date:
        pjlDatesModule.getPjlDate(pjlId) ??
        new Date().toISOString().split("T")[0],
    }
    pjlCache.set(pjlId, entry)
    return entry
  }

  async function resolveArticleId({ pjlId, articleId, linkText }) {
    if (articleId) return articleId
    if (!linkText) {
      throw new Error("articleId ou linkText requis pour résoudre la cible.")
    }

    const { linkEntries } = await loadPjl(pjlId)
    const normalizedNeedle = normalizeText(linkText)
    const match = linkEntries.find((entry) =>
      normalizeText(entry.text).includes(normalizedNeedle),
    )
    if (!match) {
      throw new Error(`Aucun lien PJL trouvé pour: ${linkText}`)
    }
    return match.articleId
  }

  async function getArticleInfo(pjlId, articleId) {
    const key = `${pjlId}::${articleId}`
    if (articleInfoCache.has(key)) {
      return articleInfoCache.get(key)
    }

    const { date } = await loadPjl(pjlId)
    const url = new URL(`http://localhost/pjl/${pjlId}`)
    url.searchParams.set("article", articleId)
    url.searchParams.set("date", date)
    const loadResult = await pageServerModule.load({
      params: { pjl: pjlId },
      url,
    })
    const articleInfo = await loadResult.articleInfoPromise
    articleInfoCache.set(key, articleInfo)
    return articleInfo
  }

  async function getBlocksForArticle({ pjlId, articleId, linkText }) {
    const resolvedArticleId = await resolveArticleId({
      pjlId,
      articleId,
      linkText,
    })
    const { blocksByArticle } = await loadPjl(pjlId)
    return {
      articleId: resolvedArticleId,
      blocks: blocksByArticle[resolvedArticleId] ?? [],
    }
  }

  function applyBlocks({ blocks, currentHtml, articleNum }) {
    let html = currentHtml ?? ""
    let skipDiff = true
    let appliedCount = 0
    const failures = []

    for (const block of blocks) {
      const { directives, isAction } =
        blockDirectivesModule.buildDirectivesFromPjlBlock(block, articleNum)

      if (directives.length === 0) {
        if (isAction) {
          failures.push({
            pjlArticleLabel: block.pjlArticleLabel,
            reason:
              "Disposition non reconnue pour l'instant pour projeter un diff.",
          })
        }
        continue
      }

      const result = projectionModule.applyProjectActionsToHtml(
        html,
        directives,
      )
      if (result.html === null) {
        failures.push({
          pjlArticleLabel: block.pjlArticleLabel,
          reason:
            result.reason ??
            "Disposition non reconnue pour l'instant pour projeter un diff.",
        })
        continue
      }

      html = result.html
      appliedCount += 1
      if (result.skipDiff !== true) {
        skipDiff = false
      }
    }

    if (appliedCount === 0) {
      return {
        html: null,
        skipDiff,
        appliedCount,
        failures,
        reason:
          "Aucune disposition projetable n'a pu être appliquée à cet article.",
      }
    }

    return {
      html,
      skipDiff,
      appliedCount,
      failures,
    }
  }

  function selectBlocks(blocks, needles = []) {
    if (needles.length === 0) return blocks
    return needles.map((needle) => {
      const match = blocks.find((block) =>
        normalizeText(block.blockText).includes(normalizeText(needle)),
      )
      if (!match) {
        throw new Error(`Bloc PJL introuvable pour: ${needle}`)
      }
      return match
    })
  }

  async function projectArticle({
    pjlId,
    articleId,
    linkText,
    blockNeedle,
    blockNeedles,
    isSection = false,
  }) {
    const blockSelection = blockNeedles ?? (blockNeedle ? [blockNeedle] : [])
    const resolvedArticleId = articleId
      ? articleId
      : await resolveArticleId({ pjlId, linkText })
    const { blocks } = await getBlocksForArticle({
      pjlId,
      articleId: resolvedArticleId,
    })
    const selectedBlocks = selectBlocks(blocks, blockSelection)
    const articleInfo = isSection
      ? undefined
      : await getArticleInfo(pjlId, resolvedArticleId)
    const currentHtml = isSection
      ? ""
      : (articleInfo?.article?.bloc_textuel ?? "")
    const articleNum = isSection
      ? undefined
      : (articleInfo?.article?.num ?? undefined)
    const projection = applyBlocks({
      blocks: selectedBlocks,
      currentHtml,
      articleNum,
    })

    return {
      articleId: resolvedArticleId,
      articleInfo,
      currentHtml,
      currentText: htmlToText(currentHtml),
      allBlocks: blocks,
      selectedBlocks,
      projection,
      projectedHtml: projection.html,
      projectedText:
        projection.html === null ? null : htmlToText(projection.html),
    }
  }

  return {
    normalizeText,
    countOccurrences,
    htmlToText,
    extractParagraphTexts,
    loadPjl,
    resolveArticleId,
    getArticleInfo,
    getBlocksForArticle,
    projectArticle,
    async cleanup() {
      await dbConnectModule.closeDbPool?.()
      await viteServer.close()
    },
  }
}
