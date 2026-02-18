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

export const PJL_INFOS = [
	{
		id: "PRJLANR5L17B1906",
		numero: "Texte initial n°1906",
		date: "2025-10-14",
		label: "Projet de loi de finances pour 2026",
	},
	{
		id: "pjl25-138",
		numero: "Texte n°138",
		date: "2025-11-24",
		label: "Projet de loi de finances pour 2026",
	},
	{
		id: "PRJLANR5L17B2247",
		numero: "Texte n°2247",
		date: "2025-12-15",
		label: "Projet de loi de finances pour 2026",
	},
	{
		id: "DECLANR5L17B2247-N0",
		numero: "Texte du 21.01.2026",
		date: "2026-01-21",
		label: "Projet de loi de finances pour 2026",
	},
	{
		id: "PRJLANR5L17B1907",
		numero: "Texte initial n°1907",
		date: "2025-10-14",
		label: "Projet de loi de financement de la sécurité sociale pour 2026",
	},
	{
		id: "pjl25-122",
		numero: "Texte n°122",
		date: "2025-11-13",
		label: "Projet de loi de financement de la sécurité sociale pour 2026",
	},
	{
		id: "PRJLANR5L17B2141",
		numero: "Texte n°2141",
		date: "2025-11-26",
		label: "Projet de loi de financement de la sécurité sociale pour 2026",
	},
	{
		id: "pjl25-193",
		numero: "Texte n°193",
		date: "2025-12-09",
		label: "Projet de loi de financement de la sécurité sociale pour 2026",
	},
	{
		id: "PRJLANR5L17BTA0188",
		numero: "Texte n°188",
		date: "2025-12-12",
		chambre: "Assemblée",
		label: "Projet de loi de financement de la sécurité sociale pour 2026",
	},
	{
		id: "PRJLANR5L17BTA0199",
		numero: "Texte adopté n°199",
		date: "2025-12-12",
		label: "Projet de loi de financement de la sécurité sociale pour 2026",
	},
	{
		id: "pjl25-024",
		numero: "Texte initial n°24",
		date: "2025-10-14",
		label:
			"Projet de loi relatif à la lutte contre les fraudes sociales et fiscales",
	},
	{
		id: "pjl25-112",
		numero: "Texte n°112",
		date: "2025-11-05",
		label:
			"Projet de loi relatif à la lutte contre les fraudes sociales et fiscales",
	},
	{
		id: "PRJLANR5L17B2115",
		numero: "Texte n°2115",
		date: "2025-11-18",
		label:
			"Projet de loi relatif à la lutte contre les fraudes sociales et fiscales",
	},
] as const

export function getPJLInfosById(
	id: string,
): { numero: string; label: string } | undefined {
	const pjl = PJL_INFOS.find((item) => item.id === id)
	if (!pjl) return undefined
	return {
		numero: pjl.numero,
		label: pjl.label,
	}
}
