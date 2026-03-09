import { webkit } from "playwright"

const base =
  process.env.LEGI_UI_BASE ?? "http://127.0.0.1:5174/pjl/PRJLANR5L17B1906"
const linkText = "article 200-0 A"

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

const redQuater = await diffRoot
  .locator("span.bg-red-50", { hasText: "199 quater F" })
  .count()
const redVicies = await diffRoot
  .locator("span.bg-red-50", { hasText: "199 vicies A" })
  .count()
if (redQuater === 0) {
  await fail("La référence 199 quater F n'est pas supprimée (surlignage rouge absent).")
}
if (redVicies === 0) {
  await fail("La référence 199 vicies A n'est pas supprimée (surlignage rouge absent).")
}

await browser.close()
console.log("OK - Article 15 (200-0 A) suppression de références.")
