import { webkit } from "playwright"

const base =
  process.env.LEGI_UI_BASE ?? "http://127.0.0.1:5174/pjl/PRJLANR5L17B1906"
const linkText = "article 224 du code général des impôts"

const browser = await webkit.launch()
const page = await browser.newPage()

const fail = async (message) => {
  await browser.close()
  throw new Error(message)
}

await page.goto(base, { waitUntil: "domcontentloaded" })
await page.waitForSelector("a.law-article-link", { timeout: 60000 })

const articleLink = page
  .locator("a.law-article-link", { hasText: linkText })
  .first()
if ((await articleLink.count()) === 0) {
  await fail(`Lien d'article introuvable: ${linkText}`)
}
await articleLink.scrollIntoViewIfNeeded()
await articleLink.click({ force: true })
await page.waitForURL(/article=/, { timeout: 60000 })
await page.waitForLoadState("domcontentloaded")

const h1 = page.locator("h1", { hasText: /Article 224/i }).first()
await h1.waitFor({ timeout: 60000 })
const h1Text = (await h1.textContent()) ?? ""
if (!h1Text.toLowerCase().includes("article 224")) {
  await fail("Article 224 introuvable dans le panneau de droite.")
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

const addedCount = await diffRoot.locator("span.bg-green-50").count()
if (addedCount === 0) {
  await fail("Aucune insertion en vert dans le diff projeté.")
}

if (/\\bIII\\s+bis\\b/i.test(diffText)) {
  await fail("Le contenu de l'article 10 fuit dans la version projetée (III bis).")
}

await browser.close()
console.log("OK - UI regression: Article 2 (CGI 224, version projetée).")
