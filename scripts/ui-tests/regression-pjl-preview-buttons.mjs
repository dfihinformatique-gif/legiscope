import { webkit } from "playwright"

const url =
  process.env.LEGI_UI_BASE_WITH_HASH ??
  "http://127.0.0.1:5174/pjl/PRJLANR5L17B1906?article=LEGIARTI000051200465#_Toc211281756"

const browser = await webkit.launch()
const page = await browser.newPage()

const fail = async (message) => {
  await browser.close()
  throw new Error(message)
}

await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 })
await page.waitForTimeout(6000)

const section = page.locator("div.assnatSection24").first()
if ((await section.count()) === 0) {
  await fail("Section PJL de l'article 2 introuvable.")
}

const clickables = section.locator(
  '.pjl-preview-clickable[data-preview-mode="single_action_diff"]',
)
const clickableCount = await clickables.count()
if (clickableCount === 0) {
  await fail("Aucune zone cliquable de droit projeté dans l'article 2 du PJL.")
}

const legacyTargetClickables = await section
  .locator('.pjl-preview-clickable[data-preview-mode="target_preview"]')
  .count()
if (legacyTargetClickables !== 0) {
  await fail(
    "Des zones cliquables de prévisualisation de cible sont encore présentes.",
  )
}

const firstClickable = clickables.first()
await firstClickable.hover()
await page.waitForTimeout(150)

const beforeClick = await page.evaluate(() => {
  const host = Array.from(document.querySelectorAll("div")).find(
    (el) =>
      el.shadowRoot &&
      el.shadowRoot.querySelector(".pjl-preview-clickable[data-preview-id]"),
  )
  const root = host?.shadowRoot ?? null
  if (!root) return null
  const clickable = root.querySelector(
    ".pjl-preview-clickable[data-preview-id]",
  )
  return {
    active: root.querySelectorAll(".is-preview-active").length,
    cursor: clickable ? window.getComputedStyle(clickable).cursor : null,
  }
})

if (!beforeClick) {
  await fail("Impossible d'inspecter le shadow DOM du PJL.")
}
if (beforeClick.active !== 0) {
  await fail(
    "Le survol du texte PJL déclenche encore une mise en surbrillance.",
  )
}
if (beforeClick.cursor === "pointer") {
  await fail("Le curseur passe encore en main sur le texte PJL cliquable.")
}

await firstClickable.click({ force: true })
await page.waitForTimeout(300)

const activeCounts = await page.evaluate(() => {
  const host = Array.from(document.querySelectorAll("div")).find(
    (el) =>
      el.shadowRoot &&
      el.shadowRoot.querySelector(".pjl-preview-clickable[data-preview-id]"),
  )
  const root = host?.shadowRoot ?? null
  if (!root) return null
  return {
    target: root.querySelectorAll(
      ".is-preview-active.pjl-preview-part-target-reference",
    ).length,
    action: root.querySelectorAll(
      ".is-preview-active.pjl-preview-part-action-verb",
    ).length,
    replacement: root.querySelectorAll(
      ".is-preview-active.pjl-preview-part-replacement-text",
    ).length,
    modal: root.querySelectorAll("button.pjl-preview-popover-action").length,
  }
})

if (!activeCounts || activeCounts.target === 0 || activeCounts.action === 0) {
  await fail(
    "Le clic sur le texte reconnu ne surligne pas correctement la cible et l'action.",
  )
}
if (activeCounts.modal === 0) {
  await fail(
    "La petite modale d'action n'apparaît pas après clic sur le texte.",
  )
}

const actionButton = page.locator("button.pjl-preview-popover-action").first()
const actionLabel = (await actionButton.textContent())
  ?.replace(/\s+/g, " ")
  .trim()
if (actionLabel !== "voir le droit projeté") {
  await fail(`Libellé inattendu pour le bouton PJL: ${actionLabel}`)
}

await actionButton.click({ force: true })
await page.waitForTimeout(2000)

const diffRoot = page.locator("div.rounded-b-md.bg-amber-50").first()
await diffRoot.waitFor({ timeout: 60000, state: "attached" })

const addedLocator = diffRoot.locator("span.bg-green-50").first()
await addedLocator.waitFor({ timeout: 60000, state: "attached" })
const added = await diffRoot.locator("span.bg-green-50").count()
if (added === 0) {
  await fail("La version projetée mono-disposition n'affiche aucune insertion.")
}

const previewTargetCount = await page
  .locator('[data-pjl-preview-target="true"]')
  .count()
if (previewTargetCount !== 0) {
  await fail(
    "Une visualisation de cible dans le droit en vigueur est encore affichée.",
  )
}

await browser.close()
console.log(
  "OK - UI regression: PJL inline click opens only projected-law preview.",
)
