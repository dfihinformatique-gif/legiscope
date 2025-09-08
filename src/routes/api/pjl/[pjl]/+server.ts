import type { RequestHandler } from "./$types"

import fs from "fs/promises"
import path from "path"

export const GET: RequestHandler = async ({ params, url }) => {
	const { pjl } = params as { pjl: string }

	const filePath = path.resolve(`static/${pjl}.html`)

	try {
		const html = await fs.readFile(filePath, "utf-8")

		const htmlWithLinks = html.replace(
			/<a\s+class="lien_(?:article|division|texte)_externe"\s+href="https:\/\/git\.tricoteuses\.fr[^"]*\/([^/]+\.md)"[^>]*>(.*?)<\/a>/g,
			(_match, p1, p2) => {
				const lawArticle = p1.replace(".md", "")
				return `<a href='${url.origin}/pjl/${pjl}?lawArticle=${lawArticle}'>${p2}</a>`
			},
		)
		return new Response(htmlWithLinks, {
			headers: {
				"Content-Type": "text/html",
			},
		})
	} catch (error) {
		console.error("Error trying to read bill HTML file:", error)
		return new Response("File not found", { status: 404 })
	}
}
