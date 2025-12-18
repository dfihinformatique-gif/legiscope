export interface Shared {
	screenWidth: number
	isMobilePhone: boolean
	activePanelMobile: "bill" | "law" | "citing"
	showBillDesktop: boolean
	showLawDesktop: boolean
	showCitingDesktop: boolean
	pjlDate: string
}

export const shared: Shared = $state({
	screenWidth: 1024,
	isMobilePhone: false,
	activePanelMobile: "bill",
	showBillDesktop: true,
	showLawDesktop: true,
	showCitingDesktop: false,
	pjlDate: "2025-10-01",
})
