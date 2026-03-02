import { webkit } from "playwright"

const base =
  process.env.LEGI_UI_BASE ?? "http://127.0.0.1:5174/pjl/PRJLANR5L17B1906"
const linkText =
  "article 10 de la loi n° 2025-127 du 14 février 2025 de finances pour 2025"
const pjlLineNeedle = "Après le III, il est inséré un III bis"

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

const paragraphs = await diffRoot.locator("p").evaluateAll((nodes) =>
  nodes.map((node) => ({
    text: (node.textContent || "").replace(/\s+/g, " ").trim(),
    html: node.innerHTML || "",
  })),
)

const findIndex = (regex) =>
  paragraphs.findIndex((paragraph) => regex.test(paragraph.text))

const indexIIIbis = findIndex(/^III\s+bis\b/i)
const indexIV = findIndex(/^IV\b/i)

if (indexIIIbis < 0) {
  await fail("III bis introuvable dans le diff projeté.")
}
if (indexIV < 0) {
  await fail("IV introuvable dans le diff projeté.")
}
if (indexIIIbis > indexIV) {
  await fail("III bis apparaît après IV dans le diff projeté.")
}

const ivParagraph = paragraphs[indexIV]
if (!ivParagraph) {
  await fail("Paragraphe IV introuvable dans le diff projeté.")
}
if (!/A\.\s*-\s*L'article 224/i.test(ivParagraph.text)) {
  await fail(
    "Le remplacement du A du IV n'est pas visible dans le diff projeté.",
  )
}

const aParagraphHtml = ivParagraph.html ?? ""
if (!/bg-(green|red)-50/.test(aParagraphHtml)) {
  await fail(
    "Le paragraphe A du IV ne contient pas de mise en évidence de diff.",
  )
}

await browser.close()
console.log("OK - UI regression: Article 10 (III bis + A du IV).")
