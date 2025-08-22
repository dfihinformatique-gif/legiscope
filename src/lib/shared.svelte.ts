export interface Shared {
	screenWidth: number
	isMobilePhone: boolean
	activePanelMobile: "bill" | "law"
	showBillDesktop: boolean
	showLawDesktop: boolean
}

export const shared: Shared = $state({
	screenWidth: 1024,
	isMobilePhone: false,
	activePanelMobile: "bill",
	showBillDesktop: true,
	showLawDesktop: true,
})
