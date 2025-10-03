<script>
	let {
		showParameterModal = $bindable(),
		parametersToVariables = $bindable(),
		children,
	} = $props()

	let dialog = $state() // HTMLDialogElement

	$effect(() => {
		if (showParameterModal) dialog.showModal()
	})
</script>

<dialog
	bind:this={dialog}
	onclose={() => (showParameterModal = false)}
	onclick={(e) => {
		if (e.target === dialog) dialog.close()
	}}
>
	<div>
		{@render children?.()}
		<hr />
		<!-- svelte-ignore a11y_autofocus -->
		<button autofocus onclick={() => dialog.close()}>close modal</button>
	</div>
</dialog>
