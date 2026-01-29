import { SvelteDate } from "svelte/reactivity"

export interface Shared {
	screenWidth: number
	isMobilePhone: boolean
	activePanelMobile: "bill" | "law" | "citing" | "summary"
	showBillDesktop: boolean
	showLawDesktop: boolean
	showCitingDesktop: boolean
	showSummaryDesktop: boolean
	pjlDate: string
}

export const shared: Shared = $state({
	screenWidth: 1024,
	isMobilePhone: false,
	activePanelMobile: "bill",
	showBillDesktop: true,
	showLawDesktop: true,
	showCitingDesktop: false,
	showSummaryDesktop: false,
	pjlDate: "2025-10-01",
})

export function formatDateFr(dateStr: string): string {
	const date = new SvelteDate(dateStr)
	return date
		.toLocaleDateString("fr-FR", {
			day: "numeric",
			month: "long",
			year: "numeric",
		})
		.replace(/^1 /, "1er ")
}
export function formatDateFrNumerique(dateStr: string): string {
	const date = new SvelteDate(dateStr)
	return date
		.toLocaleDateString("fr-FR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		})
		.replace(/\//g, ".")
}

export const formatDateFrAbrege = (dateStr: string | null) => {
	const date = new SvelteDate(dateStr)
	return date
		? date.toLocaleDateString("fr-FR", {
				day: "numeric",
				month: "short",
				year: "numeric",
			})
		: ""
}
