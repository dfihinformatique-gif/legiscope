import { webkit } from "playwright"

const base =
  process.env.LEGI_UI_BASE ?? "http://127.0.0.1:5174/pjl/PRJLANR5L17B1906"
const linkText = "article 158"

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
const href = await articleLink.getAttribute("href")
if (!href) {
  await fail(`Href introuvable pour ${linkText}`)
}
await page.goto(new URL(href, base).toString(), {
  waitUntil: "domcontentloaded",
  timeout: 60000,
})

const showProjection = page.getByRole("button", {
  name: "Voir la version projetée",
})
await showProjection.waitFor({ timeout: 60000 })
await showProjection.click({ force: true })

const diffRoot = page.locator("div.rounded-b-md.bg-amber-50").first()
await diffRoot.waitFor({ timeout: 60000, state: "attached" })

const diffText = normalize(await diffRoot.textContent())
if (diffText.includes("aucune disposition projetable")) {
  await fail("Le diff projeté de l'article 158 est vide ou non projetable.")
}

const aBisParagraph = diffRoot.locator("p", { hasText: "a bis)" }).first()
if ((await aBisParagraph.count()) === 0) {
  await fail("Le a bis inséré n'apparaît pas dans la version projetée.")
}

const insertedABis = aBisParagraph.locator("span.bg-green-50").first()
if ((await insertedABis.count()) === 0) {
  await fail("Le a bis inséré n'est pas mis en évidence dans le diff.")
}

const bBisInsertedText = diffRoot.locator("span.bg-green-50", {
  hasText: "a bis pour les prestations de retraites",
})
if ((await bBisInsertedText.count()) === 0) {
  await fail("L'ajout 'a bis' au b bis n'apparaît pas en vert dans le diff.")
}

const deletedPhrase = diffRoot.locator("span.bg-red-50", {
  hasText: "et retraites",
})
const deletedCount = await deletedPhrase.count()
if (deletedCount < 2) {
  await fail(
    "Les suppressions de 'et retraites' dans les deux phrases ciblées n'apparaissent pas dans le diff.",
  )
}

await browser.close()
console.log("OK - UI regression: Article 6 (article 158) projected diff.")
