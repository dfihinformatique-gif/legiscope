<script lang="ts">
	import DialogContent from "$lib/components/ui_transverse_components/DialogContent.svelte"
	import DialogOverlay from "$lib/components/ui_transverse_components/DialogOverlay.svelte"
	import { simplifyHtml } from "@tricoteuses/tisseuse"
	import { Dialog } from "bits-ui"
	import { onMount, type Snippet } from "svelte"

	// Props

	interface Props {
		showParameterModal: boolean
		clickedParameterButtons: HTMLButtonElement[]
		parametersToVariables: Record<string, string[]> | null
		children?: Snippet
	}

	let {
		showParameterModal = $bindable(false),
		clickedParameterButtons,
		parametersToVariables = $bindable(),
		children,
	}: Props = $props()

	// Référence au bouton fermer
	let closeButton: HTMLButtonElement

	// Focus programmatique pour l'accessibilité
	onMount(() => {
		if (showParameterModal) {
			closeButton?.focus()
		}
	})

	$effect(() => {
		// Effet pour fermer la modal en supprimant les highlights
		if (showParameterModal === false) {
			const baseBg = "#ccd3e7" /* Fond bleu clair */
			const hoverBg =
				"rgba(127, 122, 9, 0.5)" /* Fond vert translucide au hover + actif */

			for (const button of clickedParameterButtons) {
				const buttonInnerText = simplifyHtml({ removeAWithHref: true })(
					button.innerHTML,
				).output.replace(" ", "")
				button.style.setProperty("background-color", baseBg)
				Array.from(
					document.querySelectorAll<HTMLButtonElement>("button.highlighted"),
				).forEach((btn) => {
					btn.style.setProperty("background-color", baseBg, "important")
				})

				button.addEventListener("mouseenter", () => {
					if (!showParameterModal) {
						button.style.setProperty("background-color", hoverBg, "important")
						Array.from(
							document.querySelectorAll<HTMLButtonElement>(
								"button.highlighted",
							),
						).forEach((btn) => {
							const btnInnerText = simplifyHtml({ removeAWithHref: true })(
								btn.innerHTML,
							).output.replace(" ", "")

							if (
								btn.dataset.params === button.dataset.params &&
								btnInnerText === buttonInnerText
							)
								btn.style.setProperty("background-color", hoverBg, "important")
						})
					}
				})
				button.addEventListener("mouseleave", () => {
					if (!showParameterModal) {
						button.style.setProperty("background-color", baseBg, "important")
						Array.from(
							document.querySelectorAll<HTMLButtonElement>(
								"button.highlighted",
							),
						).forEach((btn) => {
							btn.style.setProperty("background-color", baseBg, "important")
						})
					}
				})
			}

			showParameterModal = false
		}
	})
</script>

<Dialog.Root bind:open={showParameterModal}>
	<Dialog.Portal>
		<DialogOverlay
			class="fixed inset-0 z-50 bg-gray-500 opacity-50 transition-opacity"
		/>

		<DialogContent
			class="fixed top-1/2 left-1/2 z-50 flex max-h-[85%] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 transform flex-col overflow-hidden rounded-md bg-white text-left shadow-xl transition-all"
		>
			<Dialog.Title
				class="items-centrer bg-le-jaune-very-dark mr-12 mb-8 flex w-full justify-between px-6 py-2 text-white"
			>
				<div class="flex">
					<h2 class="flex items-center text-lg tracking-widest uppercase">
						Amender et évaluer avec LexImpact
					</h2>
				</div>
				<!-- Bouton Fermer -->
				<div class="flex justify-end">
					<button
						bind:this={closeButton}
						class="hover:bg-le-jaune-dark flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg p-1.5 focus:ring-2 focus:ring-gray-400 focus:outline-none"
						onclick={() => (showParameterModal = false)}
					>
						<iconify-icon class="h-6 w-6 text-2xl" icon="ri-close-line"
						></iconify-icon>
						<span class="sr-only">Fermer la fenêtre</span>
					</button>
				</div>
			</Dialog.Title>

			<!-- Contenu de la modale -->
			<div class="overflow-y-auto px-6 pb-6">
				{@render children?.()}
			</div>
		</DialogContent>
	</Dialog.Portal>
</Dialog.Root>
