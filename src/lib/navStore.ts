import { browser } from "$app/environment"
import { derived, writable } from "svelte/store"

export const screenWidth = writable(browser ? window.innerWidth : 1024)

if (browser) {
	window.addEventListener("resize", () => {
		screenWidth.set(window.innerWidth)
	})
}

// Navigation mobile
export const isMobilePhone = derived(screenWidth, ($w) => $w < 768)
export const activePanelMobile = writable<"bill" | "law">("bill")

// Navigation Desktop

export const showBillDesktop = writable(true)
export const showLawDesktop = writable(true)
