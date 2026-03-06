import { webkit } from "playwright"

const base =
  process.env.LEGI_UI_BASE ?? "http://127.0.0.1:5174/pjl/PRJLANR5L17B1906"
const linkText = "chapitre III du titre Ier de la première partie"
const sectionNeedle = "Section X"

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

const addedBlock = diffRoot
  .locator("span.bg-green-50", { hasText: sectionNeedle })
  .first()
if ((await addedBlock.count()) === 0) {
  await fail("Section X introuvable en insertion dans le diff projeté.")
}

const addedText = await addedBlock.textContent()
if (!normalize(addedText).includes(normalize(sectionNeedle))) {
  await fail("Le bloc inséré ne contient pas le titre de la section X.")
}

await browser.close()
console.log("OK - UI regression: Section X rétablie (article 1).")
