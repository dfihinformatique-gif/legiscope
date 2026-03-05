import { webkit } from "playwright"

const base =
  process.env.LEGI_UI_BASE ?? "http://127.0.0.1:5174/pjl/PRJLANR5L17B1906"
const linkText = "article 1395 B bis"
const pjlLineNeedle = "L’article 1395 B bis est complété"
const insertionNeedle = "III."

const browser = await webkit.launch()
const page = await browser.newPage()

const fail = async (message) => {
  await browser.close()
  throw new Error(message)
}

await page.goto(base, { waitUntil: "domcontentloaded" })
await page.waitForSelector("a.law-article-link", { timeout: 60000 })

const pjlLine = page.getByText(pjlLineNeedle, { exact: false }).first()
await pjlLine.waitFor({ timeout: 60000 })
await pjlLine.scrollIntoViewIfNeeded()
await pjlLine.click({ force: true })

const lawLink = page
  .locator("a.law-article-link", { hasText: linkText })
  .first()
if ((await lawLink.count()) === 0) {
  await fail(`Lien introuvable: ${linkText}`)
}
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

const diffText = (await diffRoot.textContent()) ?? ""
if (diffText.includes("Cible introuvable")) {
  await fail("Diff en erreur: Cible introuvable")
}
if (diffText.includes("Aucune modification projetée")) {
  await fail("Diff vide: Aucune modification projetée")
}
if (!diffText.includes(insertionNeedle)) {
  await fail("Insertion du III introuvable dans le diff projeté")
}

const diffHtml = await diffRoot.innerHTML()
if (!diffHtml.includes("bg-green-50")) {
  await fail("Insertion non surlignée en vert")
}

await browser.close()
console.log("OK - Article 5 (25° article 1395 B bis insertion III)")
