import { webkit } from "playwright"

const base =
  process.env.LEGI_UI_BASE ?? "http://127.0.0.1:5174/pjl/PRJLANR5L17B1906"
const linkText = "article L. 1241-14"
const insertedNeedle =
  "11° Le produit de la majoration de la taxe régionale sur l'immatriculation des véhicules"

const browser = await webkit.launch()
const page = await browser.newPage()

const fail = async (message) => {
  await browser.close()
  throw new Error(message)
}

await page.goto(base, { waitUntil: "domcontentloaded" })
await page.waitForSelector("a.law-article-link", { timeout: 60000 })

const lawLink = page
  .locator("a.law-article-link", { hasText: linkText })
  .first()
if ((await lawLink.count()) === 0) {
  await fail(`Lien introuvable: ${linkText}`)
}
const href = await lawLink.getAttribute("href")
if (!href) {
  await fail(`Href introuvable pour ${linkText}`)
}
await page.goto(new URL(href, base).toString(), {
  waitUntil: "domcontentloaded",
  timeout: 60000,
})

const h1 = page.locator("h1", { hasText: /L1241-14/i }).first()
await h1.waitFor({ timeout: 60000 })
const h1Text = (await h1.textContent()) ?? ""
if (!h1Text.toLowerCase().includes("l1241-14")) {
  await fail("Article L. 1241-14 introuvable dans les donnees locales")
}

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

const addedSpan = diffRoot
  .locator("span.bg-green-50", { hasText: insertedNeedle })
  .first()
if ((await addedSpan.count()) === 0) {
  await fail("Texte rétabli non surligné en vert")
}

await browser.close()
console.log("OK - Article 15 (L. 1241-14) rétablissement")
