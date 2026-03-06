import { webkit } from "playwright"

const base =
  process.env.LEGI_UI_BASE ?? "http://127.0.0.1:5174/pjl/PRJLANR5L17B1906"
const linkText =
  "article 46 de la loi n° 2011-1977 du 28 décembre 2011 de finances pour 2012"
const tableNeedle = "Agence de l'eau Adour-Garonne"

const browser = await webkit.launch()
const page = await browser.newPage()

const fail = async (message) => {
  await browser.close()
  throw new Error(message)
}

const normalize = (value) =>
  (value ?? "")
    .replace(/[’]/g, "'")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()

await page.goto(base, { waitUntil: "domcontentloaded" })
await page.waitForSelector("a.law-article-link", { timeout: 60000 })

const articleLink = page
  .locator("a.law-article-link", { hasText: linkText })
  .first()
if ((await articleLink.count()) === 0) {
  await fail(`Lien d'article introuvable: ${linkText}`)
}
await articleLink.click()
await page.waitForURL(/article=/, { timeout: 60000 })
await page.waitForLoadState("domcontentloaded")

const showProjection = page.getByRole("button", {
  name: "Voir la version projetée",
})
await showProjection.waitFor({ timeout: 60000 })
await showProjection.click({ force: true })

const diffRoot = page.locator("div.rounded-b-md.bg-amber-50").first()
await diffRoot.waitFor({ timeout: 60000, state: "attached" })

const addedTable = diffRoot.locator("div.bg-green-50 table").first()
if ((await addedTable.count()) === 0) {
  await fail("Tableau ajouté introuvable dans le diff projeté.")
}

const addedText = await addedTable.textContent()
if (!normalize(addedText).includes(normalize(tableNeedle))) {
  await fail("Le tableau ajouté ne contient pas l'intitulé attendu.")
}

const removedTable = diffRoot.locator("div.bg-red-50 table").first()
if ((await removedTable.count()) === 0) {
  await fail("Tableau supprimé introuvable dans le diff projeté.")
}

await browser.close()
console.log("OK - UI regression: Article 36 (tableau remplacé article 46).")
