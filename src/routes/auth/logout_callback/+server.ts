import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ url }) => {
  const redirectUrl = new URL(`/`, url.origin).toString()
  return new Response(`Redirecting to ${redirectUrl}…`, {
    status: 302,
    headers: {
      location: redirectUrl,
    },
  })
}
