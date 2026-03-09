import { webkit } from "playwright"

const base =
  process.env.LEGI_UI_BASE ?? "http://127.0.0.1:5174/pjl/PRJLANR5L17B1906"
const linkText = "article 157 bis"

const browser = await webkit.launch()
const page = await browser.newPage()

const fail = async (message) => {
  await browser.close()
  throw new Error(message)
}

await page.goto(base, { waitUntil: "domcontentloaded" })
await page.waitForSelector("a.law-article-link", { timeout: 60000 })

const lawLink = page.locator("a.law-article-link", { hasText: linkText }).first()
if ((await lawLink.count()) === 0) {
  await fail(`Lien introuvable: ${linkText}`)
}
await lawLink.scrollIntoViewIfNeeded()
await lawLink.click({ force: true })
await page.waitForURL(/article=/, { timeout: 60000 })
await page.waitForLoadState("domcontentloaded")

const showProjection = page.getByRole("button", {
  name: "Voir la version projetée",
})
await showProjection.waitFor({ timeout: 60000 })
await showProjection.click({ force: true })

const diffRoot = page.locator("div.rounded-b-md.bg-amber-50").first()
await diffRoot.waitFor({ timeout: 60000, state: "attached" })

const paragraph = diffRoot.locator("p", { hasText: "article 195" }).first()
await paragraph.waitFor({ timeout: 60000 })

const removedPhraseCount = await paragraph
  .locator("span.bg-red-50", { hasText: "âgé de plus de soixante-cinq ans" })
  .count()
if (removedPhraseCount === 0) {
  await fail(
    "Suppression attendue absente pour la phrase 'âgé de plus de soixante-cinq ans…'.",
  )
}

const paragraphHtml = await paragraph.innerHTML()
const idx = paragraphHtml.toLowerCase().indexOf("article 195")
if (idx === -1) {
  await fail("Paragraphe cible introuvable autour de 'article 195'.")
}
const slice = paragraphHtml.slice(idx, idx + 240)
const commaRemoved = /bg-red-50[^>]*>\s*,\s*<\/span>/u.test(slice)
if (!commaRemoved) {
  await fail(
    "Suppression attendue absente pour la seconde occurrence de la virgule après 'article 195'.",
  )
}

await browser.close()
console.log("OK - Article 6 (157 bis) suppression phrase + 2e virgule.")
