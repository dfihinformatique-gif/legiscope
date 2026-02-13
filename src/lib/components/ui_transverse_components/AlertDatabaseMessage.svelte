<script>
	let { icon = "ri-information-fill", children } = $props()
</script>

<div
	class="mt-4 rounded-sm border-2 border-yellow-600 bg-amber-50 p-2 text-sm text-yellow-900"
>
	<iconify-icon {icon} class="mr-1 align-[-0.2rem] text-base text-yellow-600"
	></iconify-icon>
	{@render children?.()}
</div>
