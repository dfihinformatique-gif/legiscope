import type { RequestHandler } from "./$types"

import fs from "fs/promises"
import path from "path"

export const GET: RequestHandler = async ({ params, url }) => {
	const { pjl } = params as { pjl: string }

	const filePath = path.resolve(`static/${pjl}.html`)

	try {
		const html = await fs.readFile(filePath, "utf-8")
		// console.log({html})

		// const htmlWithLinks = html
		// 	.replace(
		// 		'<span style="color:#000000">– A la première phrase du second alinéa de l’article</span><span style="color:#000000">&nbsp;</span><span style="color:#000000">196</span>',
		// 		`<a href='${url.origin}/bill/${bill}?lawArticle=LEGIARTI000046860788'>– A la première phrase du second alinéa de l’article 196 B</a>`,
		// 	)
		// 	.replace(
		// 		'<span style="color:#000000">I de l’article</span><span style="color:#000000">&nbsp;</span><span style="color:#000000">197</span>',
		// 		`<a href='${url.origin}/bill/${bill}?lawArticle=LEGIARTI000051212954'>I de l’article 197</a>`,
		// 	)

		const htmlWithLinks = html.replace(
			/<a href="https:\/\/git\.tricoteuses\.fr[^"]*\/([^/]+\.md)"[^>]*>(.*?)<\/a>/g,
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
