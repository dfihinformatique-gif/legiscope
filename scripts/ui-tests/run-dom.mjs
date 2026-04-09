import assert from "node:assert/strict"
import { createServer as createHttpServer } from "node:http"

import { parseHTML } from "linkedom"
import { webkit } from "playwright"
import { createServer } from "vite"

const PJL_ID = "PRJLANR5L17B1906"
const SECTION_SELECTOR = "div.assnatSection24"
const FIXTURE_HTML =
  "<!doctype html><html><body><div id='host'></div></body></html>"
const fixtureServer = createHttpServer((_req, res) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" })
  res.end(FIXTURE_HTML)
})

const viteServer = await createServer({
  appType: "custom",
  server: {
    cors: true,
    host: "127.0.0.1",
    hmr: false,
    port: 4175,
  },
})

await viteServer.listen()
await new Promise((resolve, reject) => {
  fixtureServer.once("error", reject)
  fixtureServer.listen(4176, "127.0.0.1", resolve)
})

const baseUrl =
  viteServer.resolvedUrls?.local.at(0)?.replace(/\/$/, "") ??
  "http://127.0.0.1:4175"
const fixtureUrl = "http://127.0.0.1:4176"
let dbConnectModule

try {
  const [layoutServerModule, loadedDbConnectModule] = await Promise.all([
    viteServer.ssrLoadModule("/src/routes/pjl/[pjl]/+layout.server.ts"),
    viteServer.ssrLoadModule("/src/lib/server/db-connect.ts"),
  ])
  dbConnectModule = loadedDbConnectModule

  const layoutResult = await layoutServerModule.load({
    params: { pjl: PJL_ID },
    request: new Request(`${baseUrl}/pjl/${PJL_ID}`),
  })

  const fullDom = parseHTML(layoutResult.pjlHTML ?? "")
  const section = fullDom.document.querySelector(SECTION_SELECTOR)
  assert.ok(section, "Section PJL de test introuvable.")
  const sectionHtml = section.outerHTML.replace(
    /\bhref=(['"])\/(?!\/)/g,
    `href=$1${baseUrl}/`,
  )

  const browser = await webkit.launch()
  try {
    const page = await browser.newPage()
    await page.goto(fixtureUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    })

    const setupResult = await page.evaluate(
      async ({ baseUrl, sectionHtml }) => {
        const host = document.getElementById("host")
        if (!(host instanceof HTMLDivElement)) {
          throw new Error("Host de fixture introuvable.")
        }

        host.style.height = "900px"
        host.style.overflow = "auto"
        host.getBoundingClientRect = () => ({
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          right: 900,
          bottom: 900,
          width: 900,
          height: 900,
          toJSON() {
            return this
          },
        })

        const root = host.attachShadow({ mode: "open" })
        root.innerHTML = `<div class="content-wrapper">${sectionHtml}</div>`

        for (const section of root.querySelectorAll(
          'div[class^="assnatSection"]',
        )) {
          section.getBoundingClientRect = () => ({
            x: 0,
            y: 0,
            top: 20,
            left: 0,
            right: 800,
            bottom: 320,
            width: 800,
            height: 300,
            toJSON() {
              return this
            },
          })
        }

        const billPreviewModule = await import(
          `${baseUrl}/src/lib/pjl/bill_preview.ts`
        )
        const billInteractionsModule = await import(
          `${baseUrl}/src/lib/pjl/bill_interactions.ts`
        )
        const scrollModule = await import(`${baseUrl}/src/lib/pjl/scroll.ts`)
        const controller = billPreviewModule.createPjlPreviewController(root)

        for (const clickable of root.querySelectorAll(
          ".pjl-preview-clickable",
        )) {
          clickable.getBoundingClientRect = () => ({
            x: 80,
            y: 120,
            top: 120,
            left: 80,
            right: 520,
            bottom: 152,
            width: 440,
            height: 32,
            toJSON() {
              return this
            },
          })
        }

        const clickables = Array.from(
          root.querySelectorAll(
            '.pjl-preview-clickable[data-preview-mode="single_action_diff"]',
          ),
        )
        const clickable =
          clickables.find((element) =>
            /Après le III/i.test(element.textContent ?? ""),
          ) ??
          clickables[0] ??
          null
        const style = root.getElementById("pjl-preview-style")
        const previewId = clickable?.getAttribute("data-preview-id") ?? null

        if (!clickable || !previewId) {
          throw new Error("Zone PJL cliquable introuvable.")
        }

        const clickableTextNode = clickable.firstChild ?? clickable
        const selectionInside = {
          isCollapsed: false,
          anchorNode: clickableTextNode,
          focusNode: clickableTextNode,
          toString: () => "La seconde phrase",
        }
        const outsideNode = document.createTextNode("extérieur")
        document.body.append(outsideNode)
        const selectionOutside = {
          isCollapsed: false,
          anchorNode: outsideNode,
          focusNode: outsideNode,
          toString: () => "extérieur",
        }
        const collapsedSelection = {
          isCollapsed: true,
          anchorNode: clickableTextNode,
          focusNode: clickableTextNode,
          toString: () => "",
        }

        controller.activatePreview(previewId, clickable)

        const scrollHost = document.createElement("div")
        scrollHost.style.height = "320px"
        scrollHost.style.width = "720px"
        scrollHost.style.overflow = "auto"
        scrollHost.style.border = "1px solid transparent"
        scrollHost.style.marginTop = "24px"

        const diffContainer = document.createElement("div")
        diffContainer.style.padding = "0"

        const beforeSpacer = document.createElement("div")
        beforeSpacer.style.height = "760px"
        beforeSpacer.textContent = "Avant"

        const changedParagraph = document.createElement("p")
        changedParagraph.innerHTML =
          'Texte <span class="rounded-md px-0.5 bg-green-50 text-green-900">modifié</span> ici.'

        const afterSpacer = document.createElement("div")
        afterSpacer.style.height = "560px"
        afterSpacer.textContent = "Après"

        diffContainer.append(beforeSpacer, changedParagraph, afterSpacer)
        scrollHost.append(diffContainer)
        document.body.append(scrollHost)

        const firstChange =
          scrollModule.findFirstProjectedChangeElement(diffContainer)
        if (!(firstChange instanceof HTMLElement)) {
          throw new Error("Première modification projetée introuvable.")
        }

        scrollModule.scrollElementIntoMiddleView(firstChange, "auto")
        await new Promise((resolve) => requestAnimationFrame(() => resolve()))

        const scrollHostRect = scrollHost.getBoundingClientRect()
        const firstChangeRect = firstChange.getBoundingClientRect()
        const scrollHostCenter = scrollHostRect.top + scrollHostRect.height / 2
        const firstChangeCenter =
          firstChangeRect.top + firstChangeRect.height / 2

        const result = {
          previewRequests: controller.previewRequests.size,
          styleHasCursorText:
            style?.textContent?.includes("cursor: text;") ?? false,
          clickableText: clickable.textContent ?? "",
          activeTarget: root.querySelectorAll(
            ".is-preview-active.pjl-preview-part-target-reference",
          ).length,
          activeTargetTexts: Array.from(
            root.querySelectorAll(
              ".is-preview-active.pjl-preview-part-target-reference",
            ),
          ).map((element) =>
            (element.textContent ?? "").replace(/\s+/g, " ").trim(),
          ),
          activeAction: root.querySelectorAll(
            ".is-preview-active.pjl-preview-part-action-verb",
          ).length,
          actionLabel:
            root.querySelector("button.pjl-preview-popover-action")
              ?.textContent ?? "",
          selectionInsideBlocked:
            billInteractionsModule.hasMeaningfulSelectionWithinRoot(
              selectionInside,
              root,
            ),
          selectionOutsideBlocked:
            billInteractionsModule.hasMeaningfulSelectionWithinRoot(
              selectionOutside,
              root,
            ),
          collapsedSelectionBlocked:
            billInteractionsModule.hasMeaningfulSelectionWithinRoot(
              collapsedSelection,
              root,
            ),
          firstChangeText: firstChange.textContent ?? "",
          scrollTopAfterPreview: scrollHost.scrollTop,
          scrollDistanceFromCenter: Math.abs(
            firstChangeCenter - scrollHostCenter,
          ),
        }

        controller.clearActivePreview()
        result.remainingActive =
          root.querySelectorAll(".is-preview-active").length
        controller.cleanup()
        return result
      },
      {
        baseUrl,
        sectionHtml,
      },
    )

    assert.ok(
      setupResult.previewRequests > 0,
      "Aucune requête de prévisualisation PJL n'a été créée.",
    )
    assert.equal(
      setupResult.styleHasCursorText,
      true,
      "Le style PJL n'impose plus le curseur texte.",
    )
    assert.match(
      setupResult.clickableText,
      /Après le III/i,
      "La zone cliquable ne couvre plus la cible locale attendue.",
    )
    assert.ok(
      setupResult.activeTarget > 0,
      "La cible n'est pas surlignée après activation.",
    )
    assert.ok(
      setupResult.activeTargetTexts.some((text) => /Après le III/i.test(text)),
      "La cible locale 'Après le III' n'est pas surlignée.",
    )
    assert.ok(
      setupResult.activeTargetTexts.some((text) =>
        /article 10 de la loi n° 2025-127 du 14 février 2025 de finances pour 2025/i.test(
          text,
        ),
      ),
      "Le contexte cible 'L'article 10 de la loi 2025-127…' n'est pas surligné.",
    )
    assert.ok(
      setupResult.activeAction > 0,
      "Le verbe d'action n'est pas surligné après activation.",
    )
    assert.match(
      setupResult.actionLabel,
      /voir le droit projeté/i,
      "Libellé inattendu pour le bouton de popover PJL.",
    )
    assert.equal(
      setupResult.selectionInsideBlocked,
      true,
      "Une sélection non vide dans le shadow root devrait bloquer le clic PJL.",
    )
    assert.equal(
      setupResult.selectionOutsideBlocked,
      false,
      "Une sélection hors du shadow root ne doit pas bloquer le clic PJL.",
    )
    assert.equal(
      setupResult.collapsedSelectionBlocked,
      false,
      "Une sélection vide/collapsée ne doit pas bloquer le clic PJL.",
    )
    assert.match(
      setupResult.firstChangeText,
      /modifié/i,
      "Le helper de scroll ne trouve pas la première portion modifiée.",
    )
    assert.ok(
      setupResult.scrollTopAfterPreview > 0,
      "Le scroll automatique vers la première modification n'a pas été déclenché.",
    )
    assert.ok(
      setupResult.scrollDistanceFromCenter < 120,
      "La première modification projetée n'est pas recentrée dans le volet.",
    )
    assert.equal(
      setupResult.remainingActive,
      0,
      "La mise en surbrillance ne disparaît pas après clearActivePreview().",
    )

    console.log(
      "[ui-tests] minimal browser smoke passed: preview annotations, popover action, selection guard, and projected scroll centering.",
    )
  } finally {
    await browser.close()
  }
} finally {
  await dbConnectModule?.closeDbPool?.()
  await new Promise((resolve, reject) => {
    fixtureServer.close((error) => {
      if (error) reject(error)
      else resolve()
    })
  })
  await viteServer.close()
}
