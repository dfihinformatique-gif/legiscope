import { webkit } from "playwright"

const base =
  process.env.LEGI_UI_BASE ?? "http://127.0.0.1:5174/pjl/PRJLANR5L17B1906"

const url = new URL(base)
if (!url.searchParams.has("article")) {
  url.searchParams.set("article", "LEGIARTI000051200465")
}

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

await page.goto(url.toString(), { waitUntil: "domcontentloaded" })
await page.waitForSelector("div", { timeout: 60000 })

const mention = page.getByText("Cet article est modifié par", { exact: false })
await mention.waitFor({ timeout: 60000 })

const mentionText = normalize(await mention.textContent())
if (!/articles? 2/.test(mentionText)) {
  await fail("La mention des articles modificateurs du PJL est manquante.")
}

const button = page.getByRole("button", { name: "Voir la version projetée" })
if ((await button.count()) === 0) {
  await fail("Bouton 'Voir la version projetée' introuvable.")
}

await button.click({ force: true })

const diffRoot = page.locator("div.rounded-b-md.bg-amber-50").first()
await diffRoot.waitFor({ timeout: 60000, state: "attached" })

const hasHighlight =
  (await diffRoot.locator("span.bg-green-50").count()) > 0 ||
  (await diffRoot.locator("span.bg-red-50").count()) > 0

if (!hasHighlight) {
  await fail("Aucune mise en évidence trouvée dans la version projetée.")
}

await browser.close()
console.log("OK - UI regression: PJL aggregate projection button + mention.")
