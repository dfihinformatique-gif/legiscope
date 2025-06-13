import type { PageLoad } from "./$types"

export const load: PageLoad = async ({
	fetch,
	params,
}): Promise<{ pjlHTML: string | undefined }> => {
	const pjl = params.pjl

	if (pjl !== undefined) {
		const res = await fetch(`/api/pjl/${pjl}`, {
			headers: {
				Accept: "text/html",
				"Content-Type": "text/html; charset=utf-8",
			},
			method: "GET",
		})
		if (!res.ok) {
			console.error(`Error ${res.status} while retrieving bill content.}`)
			return { pjlHTML: undefined }
		} else {
			const pjlHTML = await res.text()
			return { pjlHTML: pjlHTML }
		}
	}
	return { pjlHTML: undefined }
}
