import assert from "node:assert/strict"
import { fileURLToPath } from "node:url"

import { webkit } from "playwright"

import { startUiDevServer } from "./dev-server.mjs"

const PROJECT_ROOT = fileURLToPath(new URL("../..", import.meta.url))
const PJL_ID = "PRJLANR5L17B1906"
const DEV_PORT = 4177

const devServer = await startUiDevServer({
  cwd: PROJECT_ROOT,
  port: DEV_PORT,
})

const browser = await webkit.launch()

try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1200 },
  })
  await page.goto(`${devServer.baseUrl}/pjl/${PJL_ID}`, {
    waitUntil: "networkidle",
    timeout: 120000,
  })

  await page.waitForFunction(
    () =>
      Array.from(document.querySelectorAll("div")).some(
        (element) => element.shadowRoot,
      ),
    undefined,
    { timeout: 120000 },
  )

  const metrics = await page.evaluate(async () => {
    const host = Array.from(document.querySelectorAll("div")).find(
      (element) => element.shadowRoot,
    )
    if (!(host instanceof HTMLDivElement) || !host.shadowRoot) {
      throw new Error("Shadow host introuvable")
    }

    const normalize = (value) => (value ?? "").replace(/\s+/g, " ").trim()
    const phrase =
      "et pour les redevables dont le chiffre d’affaires au titre de l’un de ces"
    const asciiPhrase =
      "et pour les redevables dont le chiffre d'affaires au titre de l'un de ces"

    const findClickable = () =>
      Array.from(
        host.shadowRoot.querySelectorAll(
          '.pjl-preview-clickable[data-preview-mode="single_action_diff"]',
        ),
      ).find((element) => {
        const text = normalize(element.textContent)
        return text.includes(phrase) || text.includes(asciiPhrase)
      })

    let clickable = findClickable()
    if (!(clickable instanceof HTMLElement)) {
      const sections = Array.from(
        host.shadowRoot.querySelectorAll('div[class^="assnatSection"]'),
      )
      const targetSection = sections.find((section) => {
        const text = normalize(section.textContent)
        return text.includes(phrase) || text.includes(asciiPhrase)
      })
      if (!(targetSection instanceof HTMLElement)) {
        throw new Error("Section article 4 introuvable")
      }
      host.scrollTop = Math.max(
        0,
        targetSection.offsetTop - host.clientHeight / 3,
      )
      await new Promise((resolve) => setTimeout(resolve, 800))
      clickable = findClickable()
    }

    if (!(clickable instanceof HTMLElement)) {
      throw new Error("Disposition cliquable article 4 introuvable")
    }

    const articleSection = document.querySelector(
      'section[class*="section-article"]',
    )
    if (!(articleSection instanceof HTMLElement)) {
      throw new Error("Volet droit introuvable")
    }

    const beforeScrollTop = articleSection.scrollTop

    clickable.click()

    const actionButton = host.shadowRoot.querySelector(
      "button.pjl-preview-popover-action",
    )
    if (!(actionButton instanceof HTMLButtonElement)) {
      throw new Error("Bouton voir le droit projeté introuvable")
    }
    actionButton.click()

    await new Promise((resolve) => setTimeout(resolve, 1400))

    const firstChange = document.querySelector(
      ".bg-green-50, .bg-red-50, .line-through-diff",
    )
    if (!(firstChange instanceof HTMLElement)) {
      throw new Error("Première modification projetée introuvable")
    }

    const targetRect = firstChange.getBoundingClientRect()
    const sectionRect = articleSection.getBoundingClientRect()

    return {
      clickableText: normalize(clickable.textContent),
      beforeScrollTop,
      afterScrollTop: articleSection.scrollTop,
      firstChangeText: normalize(firstChange.textContent).slice(0, 160),
      distanceFromCenter: Math.abs(
        targetRect.top +
          targetRect.height / 2 -
          (sectionRect.top + sectionRect.height / 2),
      ),
    }
  })

  assert.match(
    metrics.clickableText,
    /redevables dont le chiffre d[’']affaires/i,
    "La disposition ciblée de l'article 4 n'a pas été activée.",
  )
  assert.ok(
    metrics.afterScrollTop > metrics.beforeScrollTop,
    "Le volet droit n'a pas scrollé vers la première modification projetée.",
  )
  assert.ok(
    metrics.distanceFromCenter < 220,
    "La première portion modifiée n'est pas suffisamment recentrée dans le volet droit.",
  )

  console.log(
    "[ui-tests] real app scroll smoke passed: projected preview recenters article 4 diff.",
  )
} finally {
  await browser.close()
  await devServer.stop()
}
