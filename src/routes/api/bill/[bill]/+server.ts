import type { RequestHandler } from "./$types"

import fs from "fs/promises"
import path from "path"

export const GET: RequestHandler = async ({ params }) => {
	const { bill } = params as { bill: string }

	const filePath = path.resolve(`static/${bill}.html`)

	try {
		const html = await fs.readFile(filePath, "utf-8")
		// console.log({html})
		return new Response(html, {
			headers: {
				"Content-Type": "text/html",
			},
		})
	} catch (error) {
		console.error("Error trying to read bill HTML file:", error)
		return new Response("File not found", { status: 404 })
	}
}
