import { simplifyHtml } from "@tricoteuses/tisseuse"

export type ParameterButtonController = {
	clearActiveSelection: () => void
}

type ParameterButtonControllerOptions = {
	getShowParameterModal: () => boolean
	setShowParameterModal: (value: boolean) => void
	getActiveParam: () => string | null
	setActiveParam: (value: string | null) => void
	setClickedParameterButtons: (buttons: HTMLButtonElement[]) => void
	setParametersToVariables: (value: Record<string, string[]>) => void
	decodeParametersToVariables: (value: string) => Record<string, string[]>
	navigateToHref: (href: string) => void
}

function findFirstLinkAbove(element: HTMLElement): HTMLAnchorElement | null {
	let current: HTMLElement | null = element

	while (current) {
		let sibling = current.previousElementSibling
		while (sibling) {
			if (sibling instanceof HTMLAnchorElement) return sibling

			const links = sibling.querySelectorAll("a")
			if (links.length > 0) {
				return links[links.length - 1] as HTMLAnchorElement
			}

			sibling = sibling.previousElementSibling
		}

		current = current.parentElement
	}

	return null
}

export function createParameterButtonController(
	root: ShadowRoot,
	options: ParameterButtonControllerOptions,
): ParameterButtonController {
	const baseBg = "#ccd3e7"
	const hoverBg = "rgba(127, 122, 9, 0.5)"

	Array.from(
		root.querySelectorAll<HTMLButtonElement>("button.highlighted"),
	).forEach((button) => {
		const clone = button.cloneNode(true) as HTMLButtonElement
		button.replaceWith(clone)
	})

	const buttons = Array.from(
		root.querySelectorAll<HTMLButtonElement>("button.highlighted"),
	)

	const updateButtonColors = (): void => {
		for (const button of buttons) {
			if (
				options.getShowParameterModal() &&
				button.dataset.params === options.getActiveParam()
			) {
				button.style.setProperty("background-color", hoverBg, "important")
			} else {
				button.style.setProperty("background-color", baseBg, "important")
			}
		}
	}

	for (const button of buttons) {
		button.style.setProperty("appearance", "none", "important")
		button.style.setProperty("-webkit-appearance", "none", "important")
		button.style.setProperty("border", "none", "important")
		button.style.setProperty("box-shadow", "none", "important")
		button.style.setProperty("background-color", baseBg, "important")
		button.style.setProperty("color", "#000", "important")
		button.style.setProperty("cursor", "pointer", "important")
		button.style.setProperty("font-family", "inherit", "important")
		button.style.setProperty("font-size", "inherit", "important")
		button.style.setProperty(
			"transition",
			"background-color 0.2s ease",
			"important",
		)

		const buttonInnerText = simplifyHtml({ removeAWithHref: true })(
			button.innerHTML,
		).output.replace(" ", "")

		button.addEventListener("mouseenter", () => {
			if (options.getShowParameterModal()) return
			button.style.setProperty("background-color", hoverBg, "important")
			for (const candidate of buttons) {
				const candidateInnerText = simplifyHtml({ removeAWithHref: true })(
					candidate.innerHTML,
				).output.replace(" ", "")
				if (
					candidate.dataset.params === button.dataset.params &&
					candidateInnerText === buttonInnerText
				) {
					candidate.style.setProperty("background-color", hoverBg, "important")
				}
			}
		})

		button.addEventListener("mouseleave", () => {
			if (options.getShowParameterModal()) return
			button.style.setProperty("background-color", baseBg, "important")
			for (const candidate of buttons) {
				if (candidate.dataset.params === button.dataset.params) {
					candidate.style.setProperty("background-color", baseBg, "important")
				}
			}
		})

		button.addEventListener("click", (event: Event) => {
			event.stopPropagation()
			options.setClickedParameterButtons(buttons)
			const clickedParam = button.dataset.params ?? null

			if (
				options.getShowParameterModal() &&
				options.getActiveParam() === clickedParam
			) {
				options.setShowParameterModal(false)
				options.setActiveParam(null)
			} else {
				options.setActiveParam(clickedParam)
				const linkAbove = findFirstLinkAbove(button)
				if (linkAbove?.href) {
					const url = new URL(linkAbove.href)
					options.navigateToHref(`${url.pathname}${url.search}${url.hash}`)
				}
				options.setParametersToVariables(
					clickedParam ? options.decodeParametersToVariables(clickedParam) : {},
				)
				options.setShowParameterModal(true)
			}

			updateButtonColors()
		})
	}

	return {
		clearActiveSelection() {
			options.setShowParameterModal(false)
			options.setActiveParam(null)
			updateButtonColors()
		},
	}
}
