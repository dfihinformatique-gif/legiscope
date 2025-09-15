import type { RequestHandler } from "@sveltejs/kit"
import dedent from "dedent-js"

export const GET: RequestHandler = async () => {
	return new Response(
		dedent`
      # https://www.robotstxt.org/robotstxt.html
      User-agent: *
      Disallow: /
    `,
		{ headers: { "Content-Type": "text/plain; charset=utf-8" } },
	)
}
