import { webkit } from "playwright"

const base =
  process.env.LEGI_UI_BASE ?? "http://127.0.0.1:5174/pjl/PRJLANR5L17B1906"
const linkText =
  "article 48 de la loi n° 2025-127 du 14 février 2025 de finances pour 2025"
const pjlLineNeedle =
  "Au deuxième alinéa, après les mots : « inférieur à 3,1 milliards d’euros »"
const insertionNeedle = "et pour les redevables dont le chiffre d'affaires"

const normalize = (value) =>
  (value ?? "")
    .replace(/[’]/g, "'")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()

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
await articleLink.click()
await page.waitForURL(/article=/, { timeout: 60000 })
await page.waitForLoadState("domcontentloaded")

const pjlLine = page.getByText(pjlLineNeedle, { exact: false }).first()
await pjlLine.waitFor({ timeout: 60000 })
await pjlLine.scrollIntoViewIfNeeded()
await pjlLine.click({ force: true })

const compare = page.locator("button", {
  hasText: "Comparer au texte en vigueur",
})
await compare.waitFor({ timeout: 60000 })
for (let i = 0; i < 3; i += 1) {
  await compare.click({ force: true })
  await page.waitForTimeout(1500)
  if ((await page.locator("div.rounded-b-md.bg-amber-50").count()) > 0) break
}

const diffRoot = page.locator("div.rounded-b-md.bg-amber-50").first()
await diffRoot.waitFor({ timeout: 60000, state: "attached" })

const span = diffRoot
  .locator("span.bg-green-50", {
    hasText: "et pour les redevables dont",
  })
  .first()

if ((await span.count()) === 0) {
  await fail("Insertion introuvable en surlignage vert dans le diff projeté.")
}

const spanText = await span.textContent()
if (!normalize(spanText).includes(normalize(insertionNeedle))) {
  await fail("L'insertion n'apparait pas en un seul bloc vert (phrase coupée).")
}

await browser.close()
console.log("OK - Article 4 (IV B b) insertion highlight")
