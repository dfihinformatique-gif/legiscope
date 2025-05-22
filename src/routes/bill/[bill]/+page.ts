import type { PageLoad } from "./$types"

export const load: PageLoad = async ({
	fetch,
	params,
}): Promise<{ billHTML: string | undefined }> => {
	const bill = params.bill

	if (bill !== undefined) {
		const res = await fetch(`/api/bill/${bill}`, {
			headers: {
				Accept: "text/html",
				"Content-Type": "text/html; charset=utf-8",
			},
			method: "GET",
		})
		if (!res.ok) {
			console.error(`Error ${res.status} while retrieving bill content.}`)
			return { billHTML: undefined }
		} else {
			const billHTML = await res.text()
			return { billHTML }
		}
	}
	return { billHTML: undefined }
}
