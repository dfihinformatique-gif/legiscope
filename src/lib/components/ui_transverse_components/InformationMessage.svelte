<script>
	let { icon = "ri-information-fill", children } = $props()
</script>

<div
	class="mt-4 rounded-sm border-2 border-[#e1b3b3] bg-[#fef4f4] p-2 text-sm text-[#835454]"
>
	<iconify-icon {icon} class="mr-1 align-[-0.2rem] text-base text-[#C27272]"
	></iconify-icon>
	{@render children?.()}
</div>
