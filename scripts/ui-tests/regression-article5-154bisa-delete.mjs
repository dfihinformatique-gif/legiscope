import { webkit } from "playwright"

const base =
  process.env.LEGI_UI_BASE ?? "http://127.0.0.1:5174/pjl/PRJLANR5L17B1906"
const linkText = "article 154 bis A"
const removedNeedle = "Les indemnités journalières"

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

const removedSpan = diffRoot
  .locator("span.bg-red-50", { hasText: removedNeedle })
  .first()
if ((await removedSpan.count()) === 0) {
  await fail("Suppression de l'alinéa non surlignée en rouge")
}

await browser.close()
console.log("OK - Article 5 (154 bis A) deletion of second alinéa")
