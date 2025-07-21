import { browser } from "$app/environment"
import { derived, get, writable } from "svelte/store"

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

/* Fonctionnement des boutons : */

export function toggleBill() {
	showBillDesktop.update((val) => {
		if (val && !get(showLawDesktop)) {
			/* Si on veut cacher Bill mais Law est fermé aussi, on ouvre Law */
			showLawDesktop.set(true)
			return false /* cacher Bill */
		}
		return !val /* sinon toggle normal */
	})
}

export function toggleLaw() {
	showLawDesktop.update((val) => {
		if (val && !get(showBillDesktop)) {
			/* Si on veut cacher Law mais Bill est fermé aussi, on ouvre Bill */
			showBillDesktop.set(true)
			return false /* cacher Law */
		}
		return !val /* sinon toggle normal */
	})
}
