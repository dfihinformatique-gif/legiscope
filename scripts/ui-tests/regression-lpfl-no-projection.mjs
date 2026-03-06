import { webkit } from "playwright"

const base =
  process.env.LEGI_UI_BASE ?? "http://127.0.0.1:5174/pjl/PRJLANR5L17B1906"
const linkText =
  "la loi de programmation des finances publiques pour les années 2023 à 2027"

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

const projectionButton = page.getByRole("button", {
  name: "Voir la version projetée",
})
if ((await projectionButton.count()) > 0) {
  await fail(
    "Le bouton 'Voir la version projetée' ne doit pas apparaître pour une simple référence.",
  )
}

await browser.close()
console.log(
  "OK - UI regression: LPFP reference is not treated as modification.",
)
