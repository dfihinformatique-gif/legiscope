<script lang="ts">
	import DialogContent from "$lib/components/ui_transverse_components/DialogContent.svelte"
	import DialogOverlay from "$lib/components/ui_transverse_components/DialogOverlay.svelte"
	import { Dialog } from "bits-ui"
	import { onMount } from "svelte"

	// Props
	let { showParameterModal = $bindable(false), children, onClose } = $props()

	// Référence au bouton fermer
	let closeButton: HTMLButtonElement

	// Focus programmatique pour l'accessibilité
	onMount(() => {
		if (showParameterModal) {
			closeButton?.focus()
		}
	})

	function closeModal() {
		showParameterModal = false
		onClose?.()
	}
</script>

<Dialog.Root bind:open={showParameterModal}>
	<Dialog.Portal>
		<DialogOverlay
			class="fixed inset-0 z-50 bg-gray-500 opacity-50 transition-opacity"
		/>

		<DialogContent
			class="fixed top-1/2 left-1/2 z-50 flex max-h-[85%] w-full max-w-md -translate-x-1/2 -translate-y-1/2 transform flex-col overflow-hidden rounded-md bg-white p-6 text-left shadow-xl transition-all"
		>
			<!-- Bouton Fermer -->
			<div class="flex justify-end">
				<button
					bind:this={closeButton}
					class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg p-1.5 hover:bg-gray-200 focus:ring-2 focus:ring-gray-400 focus:outline-none active:bg-gray-200"
					onclick={closeModal}
				>
					<iconify-icon class="h-6 w-6 text-2xl" icon="ri-close-line"
					></iconify-icon>
					<span class="sr-only">Fermer la fenêtre</span>
				</button>
			</div>

			<!-- Contenu de la modale -->
			<div class="overflow-y-auto">
				{@render children?.()}
			</div>
		</DialogContent>
	</Dialog.Portal>
</Dialog.Root>
