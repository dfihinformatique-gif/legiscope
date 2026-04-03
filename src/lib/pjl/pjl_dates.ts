const PJL_DATES = new Map<string, string>([
	["PRJLANR5L17B1906", "2025-10-14"],
	["PRJLANR5L17B1907", "2025-10-14"],
	["pjl25-024", "2025-10-14"],
	["pjl25-138", "2025-11-24"],
	["PRJLANR5L17B2247", "2025-12-15"],
	["pjl25-122", "2025-11-13"],
	["PRJLANR5L17B2141", "2025-11-26"],
	["pjl25-193", "2025-12-09"],
	["pjl25-112", "2025-11-05"],
	["PRJLANR5L17B2115", "2025-11-05"],
	["PRJLANR5L17BTC2250", "2025-12-17"],
	["DECLANR5L17B2247-N0", "2026-01-21"],
])

export function getPjlDate(pjlId: string): string | undefined {
	return PJL_DATES.get(pjlId)
}
