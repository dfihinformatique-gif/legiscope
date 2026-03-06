import { webkit } from "playwright"

const base =
  process.env.LEGI_UI_BASE ?? "http://127.0.0.1:5174/pjl/PRJLANR5L17B1906"
const articleId = "LEGIARTI000051765336"

const browser = await webkit.launch()
const page = await browser.newPage()

const fail = async (message) => {
  await browser.close()
  throw new Error(message)
}

await page.goto(`${base}?article=${articleId}`, {
  waitUntil: "domcontentloaded",
})
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

await browser.close()
console.log("OK - Article 5 (article 81 abrogations)")
